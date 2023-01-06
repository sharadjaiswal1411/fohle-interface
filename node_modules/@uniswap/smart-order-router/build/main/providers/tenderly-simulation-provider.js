"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenderlySimulator = exports.FallbackTenderlySimulator = void 0;
const axios_1 = __importDefault(require("axios"));
const ethers_1 = require("ethers/lib/ethers");
const Erc20__factory_1 = require("../types/other/factories/Erc20__factory");
const SwapRouter02__factory_1 = require("../types/other/factories/SwapRouter02__factory");
const util_1 = require("../util");
const callData_1 = require("../util/callData");
const gas_factory_helpers_1 = require("../util/gas-factory-helpers");
const TENDERLY_BATCH_SIMULATE_API = (tenderlyBaseUrl, tenderlyUser, tenderlyProject) => `${tenderlyBaseUrl}/api/v1/account/${tenderlyUser}/project/${tenderlyProject}/simulate-batch`;
// We multiply tenderly gas estimate by this estimate to overestimate gas fee
const ESTIMATE_MULTIPLIER = 1.25;
const checkTokenApproved = async (fromAddress, inputAmount, provider) => {
    const tokenContract = Erc20__factory_1.Erc20__factory.connect(inputAmount.currency.wrapped.address, provider);
    const allowance = await tokenContract.allowance(fromAddress, util_1.SWAP_ROUTER_ADDRESS);
    // Return true if token allowance is greater than input amount
    return allowance.gt(ethers_1.BigNumber.from(inputAmount.quotient.toString()));
};
class FallbackTenderlySimulator {
    constructor(tenderlyBaseUrl, tenderlyUser, tenderlyProject, tenderlyAccessKey, provider, v2PoolProvider, v3PoolProvider, tenderlySimulator) {
        this.tenderlySimulator =
            tenderlySimulator !== null && tenderlySimulator !== void 0 ? tenderlySimulator : new TenderlySimulator(tenderlyBaseUrl, tenderlyUser, tenderlyProject, tenderlyAccessKey, v2PoolProvider, v3PoolProvider);
        this.provider = provider;
        this.v2PoolProvider = v2PoolProvider;
        this.v3PoolProvider = v3PoolProvider;
    }
    async ethEstimateGas(fromAddress, route, l2GasData) {
        const currencyIn = route.trade.inputAmount.currency;
        const router = SwapRouter02__factory_1.SwapRouter02__factory.connect(util_1.SWAP_ROUTER_ADDRESS, this.provider);
        const estimatedGasUsed = await router.estimateGas['multicall(bytes[])']([route.methodParameters.calldata], {
            from: fromAddress,
            value: ethers_1.BigNumber.from(currencyIn.isNative ? route.methodParameters.value : '0'),
        });
        const { estimatedGasUsedUSD, estimatedGasUsedQuoteToken, quoteGasAdjusted, } = await (0, gas_factory_helpers_1.calculateGasUsed)(route.quote.currency.chainId, route, estimatedGasUsed, this.v2PoolProvider, this.v3PoolProvider, l2GasData);
        return (0, gas_factory_helpers_1.initSwapRouteFromExisting)(route, this.v2PoolProvider, this.v3PoolProvider, quoteGasAdjusted, estimatedGasUsed, estimatedGasUsedQuoteToken, estimatedGasUsedUSD);
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
                util_1.log.info({ err: err }, 'Error calling eth estimate gas!');
                return Object.assign(Object.assign({}, swapRoute), { simulationError: true });
            }
        }
        // simulate via tenderly
        try {
            return await this.tenderlySimulator.simulateTransaction(fromAddress, swapRoute, l2GasData);
        }
        catch (err) {
            util_1.log.info({ err: err }, 'Failed to simulate via Tenderly!');
            // set error flag to true
            return Object.assign(Object.assign({}, swapRoute), { simulationError: true });
        }
    }
}
exports.FallbackTenderlySimulator = FallbackTenderlySimulator;
class TenderlySimulator {
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
        if ([util_1.ChainId.CELO, util_1.ChainId.CELO_ALFAJORES].includes(chainId)) {
            const msg = 'Celo not supported by Tenderly!';
            util_1.log.info(msg);
            return Object.assign(Object.assign({}, swapRoute), { simulationError: true });
        }
        if (!swapRoute.methodParameters) {
            const msg = 'No calldata provided to simulate transaction';
            util_1.log.info(msg);
            throw new Error(msg);
        }
        const { calldata } = swapRoute.methodParameters;
        util_1.log.info({
            calldata: swapRoute.methodParameters.calldata,
            fromAddress: fromAddress,
            chainId: chainId,
            tokenInAddress: tokenIn.address,
        }, 'Simulating transaction via Tenderly');
        const approve = {
            network_id: chainId,
            input: callData_1.APPROVE_TOKEN_FOR_TRANSFER,
            to: tokenIn.address,
            value: '0',
            from: fromAddress,
            gasPrice: '0',
            gas: 30000000,
        };
        const swap = {
            network_id: chainId,
            input: calldata,
            to: util_1.SWAP_ROUTER_ADDRESS,
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
        const resp = (await axios_1.default.post(url, body, opts)).data;
        // Validate tenderly response body
        if (!resp ||
            resp.simulation_results.length < 2 ||
            !resp.simulation_results[1].transaction ||
            resp.simulation_results[1].transaction.error_message) {
            const msg = `Failed to Simulate Via Tenderly!: ${resp.simulation_results[1].transaction.error_message}`;
            util_1.log.info({ err: resp.simulation_results[1].transaction.error_message }, msg);
            return Object.assign(Object.assign({}, swapRoute), { simulationError: true });
        }
        util_1.log.info({ approve: resp.simulation_results[0], swap: resp.simulation_results[1] }, 'Simulated Approval + Swap via Tenderly');
        // Parse the gas used in the simulation response object, and then pad it so that we overestimate.
        const estimatedGasUsed = ethers_1.BigNumber.from((resp.simulation_results[1].transaction.gas_used * ESTIMATE_MULTIPLIER).toFixed(0));
        const { estimatedGasUsedUSD, estimatedGasUsedQuoteToken, quoteGasAdjusted, } = await (0, gas_factory_helpers_1.calculateGasUsed)(chainId, swapRoute, estimatedGasUsed, this.v2PoolProvider, this.v3PoolProvider, l2GasData);
        return (0, gas_factory_helpers_1.initSwapRouteFromExisting)(swapRoute, this.v2PoolProvider, this.v3PoolProvider, quoteGasAdjusted, estimatedGasUsed, estimatedGasUsedQuoteToken, estimatedGasUsedUSD);
    }
}
exports.TenderlySimulator = TenderlySimulator;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVuZGVybHktc2ltdWxhdGlvbi1wcm92aWRlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9wcm92aWRlcnMvdGVuZGVybHktc2ltdWxhdGlvbi1wcm92aWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFFQSxrREFBMEI7QUFDMUIsOENBQThDO0FBRzlDLDRFQUF5RTtBQUN6RSwwRkFBdUY7QUFDdkYsa0NBQTRFO0FBQzVFLCtDQUE4RDtBQUM5RCxxRUFHcUM7QUFvQnJDLE1BQU0sMkJBQTJCLEdBQUcsQ0FDbEMsZUFBdUIsRUFDdkIsWUFBb0IsRUFDcEIsZUFBdUIsRUFDdkIsRUFBRSxDQUNGLEdBQUcsZUFBZSxtQkFBbUIsWUFBWSxZQUFZLGVBQWUsaUJBQWlCLENBQUM7QUFFaEcsNkVBQTZFO0FBQzdFLE1BQU0sbUJBQW1CLEdBQUcsSUFBSSxDQUFDO0FBdUJqQyxNQUFNLGtCQUFrQixHQUFHLEtBQUssRUFDOUIsV0FBbUIsRUFDbkIsV0FBMkIsRUFDM0IsUUFBeUIsRUFDUCxFQUFFO0lBQ3BCLE1BQU0sYUFBYSxHQUFHLCtCQUFjLENBQUMsT0FBTyxDQUMxQyxXQUFXLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQ3BDLFFBQVEsQ0FDVCxDQUFDO0lBQ0YsTUFBTSxTQUFTLEdBQUcsTUFBTSxhQUFhLENBQUMsU0FBUyxDQUM3QyxXQUFXLEVBQ1gsMEJBQW1CLENBQ3BCLENBQUM7SUFDRiw4REFBOEQ7SUFDOUQsT0FBTyxTQUFTLENBQUMsRUFBRSxDQUFDLGtCQUFTLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBQ3ZFLENBQUMsQ0FBQztBQUVGLE1BQWEseUJBQXlCO0lBTXBDLFlBQ0UsZUFBdUIsRUFDdkIsWUFBb0IsRUFDcEIsZUFBdUIsRUFDdkIsaUJBQXlCLEVBQ3pCLFFBQXlCLEVBQ3pCLGNBQStCLEVBQy9CLGNB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