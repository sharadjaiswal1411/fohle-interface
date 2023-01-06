import axios from 'axios';
import { BigNumber } from 'ethers/lib/ethers';
import { Erc20__factory } from '../types/other/factories/Erc20__factory';
import { SwapRouter02__factory } from '../types/other/factories/SwapRouter02__factory';
import { ChainId, log, SWAP_ROUTER_ADDRESS } from '../util';
import { APPROVE_TOKEN_FOR_TRANSFER } from '../util/callData';
import { calculateGasUsed, initSwapRouteFromExisting, } from '../util/gas-factory-helpers';
const TENDERLY_BATCH_SIMULATE_API = (tenderlyBaseUrl, tenderlyUser, tenderlyProject) => `${tenderlyBaseUrl}/api/v1/account/${tenderlyUser}/project/${tenderlyProject}/simulate-batch`;
// We multiply tenderly gas estimate by this estimate to overestimate gas fee
const ESTIMATE_MULTIPLIER = 1.25;
const checkTokenApproved = async (fromAddress, inputAmount, provider) => {
    const tokenContract = Erc20__factory.connect(inputAmount.currency.wrapped.address, provider);
    const allowance = await tokenContract.allowance(fromAddress, SWAP_ROUTER_ADDRESS);
    // Return true if token allowance is greater than input amount
    return allowance.gt(BigNumber.from(inputAmount.quotient.toString()));
};
export class FallbackTenderlySimulator {
    constructor(tenderlyBaseUrl, tenderlyUser, tenderlyProject, tenderlyAccessKey, provider, v2PoolProvider, v3PoolProvider, tenderlySimulator) {
        this.tenderlySimulator =
            tenderlySimulator !== null && tenderlySimulator !== void 0 ? tenderlySimulator : new TenderlySimulator(tenderlyBaseUrl, tenderlyUser, tenderlyProject, tenderlyAccessKey, v2PoolProvider, v3PoolProvider);
        this.provider = provider;
        this.v2PoolProvider = v2PoolProvider;
        this.v3PoolProvider = v3PoolProvider;
    }
    async ethEstimateGas(fromAddress, route, l2GasData) {
        const currencyIn = route.trade.inputAmount.currency;
        const router = SwapRouter02__factory.connect(SWAP_ROUTER_ADDRESS, this.provider);
        const estimatedGasUsed = await router.estimateGas['multicall(bytes[])']([route.methodParameters.calldata], {
            from: fromAddress,
            value: BigNumber.from(currencyIn.isNative ? route.methodParameters.value : '0'),
        });
        const { estimatedGasUsedUSD, estimatedGasUsedQuoteToken, quoteGasAdjusted, } = await calculateGasUsed(route.quote.currency.chainId, route, estimatedGasUsed, this.v2PoolProvider, this.v3PoolProvider, l2GasData);
        return initSwapRouteFromExisting(route, this.v2PoolProvider, this.v3PoolProvider, quoteGasAdjusted, estimatedGasUsed, estimatedGasUsedQuoteToken, estimatedGasUsedUSD);
    }
    async simulateTransaction(fromAddress, swapRoute, l2GasData) {
        // Make call to eth estimate gas if possible
        // For erc20s, we must check if the token allowance is sufficient
        const inputAmount = swapRoute.trade.inputAmount;
        if (inputAmount.currency.isNative ||
            (await checkTokenApproved(fromAddress, inputAmount, this.provider))) {
            try {
                const swapRouteWithGasEstimate = await this.ethEstimateGas(fromAddress, swapRoute, l2GasData);
                return swapRouteWithGasEstimate;
            }
            catch (err) {
                log.info({ err: err }, 'Error calling eth estimate gas!');
                return { ...swapRoute, simulationError: true };
            }
        }
        // simulate via tenderly
        try {
            return await this.tenderlySimulator.simulateTransaction(fromAddress, swapRoute, l2GasData);
        }
        catch (err) {
            log.info({ err: err }, 'Failed to simulate via Tenderly!');
            // set error flag to true
            return { ...swapRoute, simulationError: true };
        }
    }
}
export class TenderlySimulator {
    constructor(tenderlyBaseUrl, tenderlyUser, tenderlyProject, tenderlyAccessKey, v2PoolProvider, v3PoolProvider) {
        this.tenderlyBaseUrl = tenderlyBaseUrl;
        this.tenderlyUser = tenderlyUser;
        this.tenderlyProject = tenderlyProject;
        this.tenderlyAccessKey = tenderlyAccessKey;
        this.v2PoolProvider = v2PoolProvider;
        this.v3PoolProvider = v3PoolProvider;
    }
    async simulateTransaction(fromAddress, swapRoute, l2GasData) {
        const currencyIn = swapRoute.trade.inputAmount.currency;
        const tokenIn = currencyIn.wrapped;
        const chainId = tokenIn.chainId;
        if ([ChainId.CELO, ChainId.CELO_ALFAJORES].includes(chainId)) {
            const msg = 'Celo not supported by Tenderly!';
            log.info(msg);
            return { ...swapRoute, simulationError: true };
        }
        if (!swapRoute.methodParameters) {
            const msg = 'No calldata provided to simulate transaction';
            log.info(msg);
            throw new Error(msg);
        }
        const { calldata } = swapRoute.methodParameters;
        log.info({
            calldata: swapRoute.methodParameters.calldata,
            fromAddress: fromAddress,
            chainId: chainId,
            tokenInAddress: tokenIn.address,
        }, 'Simulating transaction via Tenderly');
        const approve = {
            network_id: chainId,
            input: APPROVE_TOKEN_FOR_TRANSFER,
            to: tokenIn.address,
            value: '0',
            from: fromAddress,
            gasPrice: '0',
            gas: 30000000,
        };
        const swap = {
            network_id: chainId,
            input: calldata,
            to: SWAP_ROUTER_ADDRESS,
            value: currencyIn.isNative ? swapRoute.methodParameters.value : '0',
            from: fromAddress,
            gasPrice: '0',
            gas: 30000000,
            type: 1,
        };
        const body = { simulations: [approve, swap] };
        const opts = {
            headers: {
                'X-Access-Key': this.tenderlyAccessKey,
            },
        };
        const url = TENDERLY_BATCH_SIMULATE_API(this.tenderlyBaseUrl, this.tenderlyUser, this.tenderlyProject);
        const resp = (await axios.post(url, body, opts)).data;
        // Validate tenderly response body
        if (!resp ||
            resp.simulation_results.length < 2 ||
            !resp.simulation_results[1].transaction ||
            resp.simulation_results[1].transaction.error_message) {
            const msg = `Failed to Simulate Via Tenderly!: ${resp.simulation_results[1].transaction.error_message}`;
            log.info({ err: resp.simulation_results[1].transaction.error_message }, msg);
            return { ...swapRoute, simulationError: true };
        }
        log.info({ approve: resp.simulation_results[0], swap: resp.simulation_results[1] }, 'Simulated Approval + Swap via Tenderly');
        // Parse the gas used in the simulation response object, and then pad it so that we overestimate.
        const estimatedGasUsed = BigNumber.from((resp.simulation_results[1].transaction.gas_used * ESTIMATE_MULTIPLIER).toFixed(0));
        const { estimatedGasUsedUSD, estimatedGasUsedQuoteToken, quoteGasAdjusted, } = await calculateGasUsed(chainId, swapRoute, estimatedGasUsed, this.v2PoolProvider, this.v3PoolProvider, l2GasData);
        return initSwapRouteFromExisting(swapRoute, this.v2PoolProvider, this.v3PoolProvider, quoteGasAdjusted, estimatedGasUsed, estimatedGasUsedQuoteToken, estimatedGasUsedUSD);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVuZGVybHktc2ltdWxhdGlvbi1wcm92aWRlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9wcm92aWRlcnMvdGVuZGVybHktc2ltdWxhdGlvbi1wcm92aWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFFQSxPQUFPLEtBQUssTUFBTSxPQUFPLENBQUM7QUFDMUIsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBRzlDLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUN6RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUN2RixPQUFPLEVBQUUsT0FBTyxFQUFrQixHQUFHLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxTQUFTLENBQUM7QUFDNUUsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sa0JBQWtCLENBQUM7QUFDOUQsT0FBTyxFQUNMLGdCQUFnQixFQUNoQix5QkFBeUIsR0FDMUIsTUFBTSw2QkFBNkIsQ0FBQztBQW9CckMsTUFBTSwyQkFBMkIsR0FBRyxDQUNsQyxlQUF1QixFQUN2QixZQUFvQixFQUNwQixlQUF1QixFQUN2QixFQUFFLENBQ0YsR0FBRyxlQUFlLG1CQUFtQixZQUFZLFlBQVksZUFBZSxpQkFBaUIsQ0FBQztBQUVoRyw2RUFBNkU7QUFDN0UsTUFBTSxtQkFBbUIsR0FBRyxJQUFJLENBQUM7QUF1QmpDLE1BQU0sa0JBQWtCLEdBQUcsS0FBSyxFQUM5QixXQUFtQixFQUNuQixXQUEyQixFQUMzQixRQUF5QixFQUNQLEVBQUU7SUFDcEIsTUFBTSxhQUFhLEdBQUcsY0FBYyxDQUFDLE9BQU8sQ0FDMUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUNwQyxRQUFRLENBQ1QsQ0FBQztJQUNGLE1BQU0sU0FBUyxHQUFHLE1BQU0sYUFBYSxDQUFDLFNBQVMsQ0FDN0MsV0FBVyxFQUNYLG1CQUFtQixDQUNwQixD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