"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.V3HeuristicGasModelFactory = void 0;
const bignumber_1 = require("@ethersproject/bignumber");
const sdk_core_1 = require("@uniswap/sdk-core");
const lodash_1 = __importDefault(require("lodash"));
const __1 = require("../../../..");
const util_1 = require("../../../../util");
const amounts_1 = require("../../../../util/amounts");
const gas_factory_helpers_1 = require("../../../../util/gas-factory-helpers");
const log_1 = require("../../../../util/log");
const methodParameters_1 = require("../../../../util/methodParameters");
const gas_model_1 = require("../gas-model");
const gas_costs_1 = require("./gas-costs");
/**
 * Computes a gas estimate for a V3 swap using heuristics.
 * Considers number of hops in the route, number of ticks crossed
 * and the typical base cost for a swap.
 *
 * We get the number of ticks crossed in a swap from the QuoterV2
 * contract.
 *
 * We compute gas estimates off-chain because
 *  1/ Calling eth_estimateGas for a swaps requires the caller to have
 *     the full balance token being swapped, and approvals.
 *  2/ Tracking gas used using a wrapper contract is not accurate with Multicall
 *     due to EIP-2929. We would have to make a request for every swap we wanted to estimate.
 *  3/ For V2 we simulate all our swaps off-chain so have no way to track gas used.
 *
 * @export
 * @class V3HeuristicGasModelFactory
 */
class V3HeuristicGasModelFactory extends gas_model_1.IOnChainGasModelFactory {
    constructor() {
        super();
    }
    async buildGasModel({ chainId, gasPriceWei, v3poolProvider: poolProvider, token, l2GasDataProvider, }) {
        const l2GasData = l2GasDataProvider
            ? await l2GasDataProvider.getGasData()
            : undefined;
        const usdPool = await (0, gas_factory_helpers_1.getHighestLiquidityV3USDPool)(chainId, poolProvider);
        const calculateL1GasFees = async (route) => {
            const swapOptions = {
                recipient: '0x0000000000000000000000000000000000000001',
                deadline: 100,
                slippageTolerance: new sdk_core_1.Percent(5, 10000),
            };
            let l1Used = bignumber_1.BigNumber.from(0);
            let l1FeeInWei = bignumber_1.BigNumber.from(0);
            if (chainId == util_1.ChainId.OPTIMISM || chainId == util_1.ChainId.OPTIMISTIC_KOVAN) {
                [l1Used, l1FeeInWei] = this.calculateOptimismToL1SecurityFee(route, swapOptions, l2GasData);
            }
            else if (chainId == util_1.ChainId.ARBITRUM_ONE ||
                chainId == util_1.ChainId.ARBITRUM_RINKEBY) {
                [l1Used, l1FeeInWei] = this.calculateArbitrumToL1SecurityFee(route, swapOptions, l2GasData);
            }
            // wrap fee to native currency
            const nativeCurrency = __1.WRAPPED_NATIVE_CURRENCY[chainId];
            const costNativeCurrency = amounts_1.CurrencyAmount.fromRawAmount(nativeCurrency, l1FeeInWei.toString());
            // convert fee into usd
            const nativeTokenPrice = usdPool.token0.address == nativeCurrency.address
                ? usdPool.token0Price
                : usdPool.token1Price;
            const gasCostL1USD = nativeTokenPrice.quote(costNativeCurrency);
            let gasCostL1QuoteToken = costNativeCurrency;
            // if the inputted token is not in the native currency, quote a native/quote token pool to get the gas cost in terms of the quote token
            if (!token.equals(nativeCurrency)) {
                const nativePool = await (0, gas_factory_helpers_1.getHighestLiquidityV3NativePool)(token, poolProvider);
                if (!nativePool) {
                    log_1.log.info('Could not find a pool to convert the cost into the quote token');
                    gasCostL1QuoteToken = amounts_1.CurrencyAmount.fromRawAmount(token, 0);
                }
                else {
                    const nativeTokenPrice = nativePool.token0.address == nativeCurrency.address
                        ? nativePool.token0Price
                        : nativePool.token1Price;
                    gasCostL1QuoteToken = nativeTokenPrice.quote(costNativeCurrency);
                }
            }
            // gasUsedL1 is the gas units used calculated from the bytes of the calldata
            // gasCostL1USD and gasCostL1QuoteToken is the cost of gas in each of those tokens
            return {
                gasUsedL1: l1Used,
                gasCostL1USD,
                gasCostL1QuoteToken,
            };
        };
        // If our quote token is WETH, we don't need to convert our gas use to be in terms
        // of the quote token in order to produce a gas adjusted amount.
        // We do return a gas use in USD however, so we still convert to usd.
        const nativeCurrency = __1.WRAPPED_NATIVE_CURRENCY[chainId];
        if (token.equals(nativeCurrency)) {
            const estimateGasCost = (routeWithValidQuote) => {
                const { totalGasCostNativeCurrency, baseGasUse } = this.estimateGas(routeWithValidQuote, gasPriceWei, chainId);
                const token0 = usdPool.token0.address == nativeCurrency.address;
                const nativeTokenPrice = token0
                    ? usdPool.token0Price
                    : usdPool.token1Price;
                const gasCostInTermsOfUSD = nativeTokenPrice.quote(totalGasCostNativeCurrency);
                return {
                    gasEstimate: baseGasUse,
                    gasCostInToken: totalGasCostNativeCurrency,
                    gasCostInUSD: gasCostInTermsOfUSD,
                };
            };
            return {
                estimateGasCost,
                calculateL1GasFees,
            };
        }
        // If the quote token is not in the native currency, we convert the gas cost to be in terms of the quote token.
        // We do this by getting the highest liquidity <quoteToken>/<nativeCurrency> pool. eg. <quoteToken>/ETH pool.
        const nativePool = await (0, gas_factory_helpers_1.getHighestLiquidityV3NativePool)(token, poolProvider);
        const usdToken = usdPool.token0.address == nativeCurrency.address
            ? usdPool.token1
            : usdPool.token0;
        const estimateGasCost = (routeWithValidQuote) => {
            const { totalGasCostNativeCurrency, baseGasUse } = this.estimateGas(routeWithValidQuote, gasPriceWei, chainId);
            if (!nativePool) {
                log_1.log.info(`Unable to find ${nativeCurrency.symbol} pool with the quote token, ${token.symbol} to produce gas adjusted costs. Route will not account for gas.`);
                return {
                    gasEstimate: baseGasUse,
                    gasCostInToken: amounts_1.CurrencyAmount.fromRawAmount(token, 0),
                    gasCostInUSD: amounts_1.CurrencyAmount.fromRawAmount(usdToken, 0),
                };
            }
            const token0 = nativePool.token0.address == nativeCurrency.address;
            // returns mid price in terms of the native currency (the ratio of quoteToken/nativeToken)
            const nativeTokenPrice = token0
                ? nativePool.token0Price
                : nativePool.token1Price;
            let gasCostInTermsOfQuoteToken;
            try {
                // native token is base currency
                gasCostInTermsOfQuoteToken = nativeTokenPrice.quote(totalGasCostNativeCurrency);
            }
            catch (err) {
                log_1.log.info({
                    nativeTokenPriceBase: nativeTokenPrice.baseCurrency,
                    nativeTokenPriceQuote: nativeTokenPrice.quoteCurrency,
                    gasCostInEth: totalGasCostNativeCurrency.currency,
                }, 'Debug eth price token issue');
                throw err;
            }
            // true if token0 is the native currency
            const token0USDPool = usdPool.token0.address == nativeCurrency.address;
            // gets the mid price of the pool in terms of the native token
            const nativeTokenPriceUSDPool = token0USDPool
                ? usdPool.token0Price
                : usdPool.token1Price;
            let gasCostInTermsOfUSD;
            try {
                gasCostInTermsOfUSD = nativeTokenPriceUSDPool.quote(totalGasCostNativeCurrency);
            }
            catch (err) {
                log_1.log.info({
                    usdT1: usdPool.token0.symbol,
                    usdT2: usdPool.token1.symbol,
                    gasCostInNativeToken: totalGasCostNativeCurrency.currency.symbol,
                }, 'Failed to compute USD gas price');
                throw err;
            }
            return {
                gasEstimate: baseGasUse,
                gasCostInToken: gasCostInTermsOfQuoteToken,
                gasCostInUSD: gasCostInTermsOfUSD,
            };
        };
        return {
            estimateGasCost: estimateGasCost.bind(this),
            calculateL1GasFees,
        };
    }
    estimateGas(routeWithValidQuote, gasPriceWei, chainId) {
        const totalInitializedTicksCrossed = bignumber_1.BigNumber.from(Math.max(1, lodash_1.default.sum(routeWithValidQuote.initializedTicksCrossedList)));
        const totalHops = bignumber_1.BigNumber.from(routeWithValidQuote.route.pools.length);
        const hopsGasUse = (0, gas_costs_1.COST_PER_HOP)(chainId).mul(totalHops);
        const tickGasUse = (0, gas_costs_1.COST_PER_INIT_TICK)(chainId).mul(totalInitializedTicksCrossed);
        const uninitializedTickGasUse = gas_costs_1.COST_PER_UNINIT_TICK.mul(0);
        // base estimate gas used based on chainId estimates for hops and ticks gas useage
        const baseGasUse = (0, gas_costs_1.BASE_SWAP_COST)(chainId)
            .add(hopsGasUse)
            .add(tickGasUse)
            .add(uninitializedTickGasUse);
        const baseGasCostWei = gasPriceWei.mul(baseGasUse);
        const wrappedCurrency = __1.WRAPPED_NATIVE_CURRENCY[chainId];
        const totalGasCostNativeCurrency = amounts_1.CurrencyAmount.fromRawAmount(wrappedCurrency, baseGasCostWei.toString());
        return {
            totalGasCostNativeCurrency,
            totalInitializedTicksCrossed,
            baseGasUse,
        };
    }
    /**
     * To avoid having a call to optimism's L1 security fee contract for every route and amount combination,
     * we replicate the gas cost accounting here.
     */
    calculateOptimismToL1SecurityFee(routes, swapConfig, gasData) {
        const { l1BaseFee, scalar, decimals, overhead } = gasData;
        const route = routes[0];
        const inputToken = route.tradeType == sdk_core_1.TradeType.EXACT_INPUT
            ? route.amount.currency
            : route.quote.currency;
        const outputToken = route.tradeType == sdk_core_1.TradeType.EXACT_INPUT
            ? route.quote.currency
            : route.amount.currency;
        // build trade for swap calldata
        const trade = (0, methodParameters_1.buildTrade)(inputToken, outputToken, route.tradeType, routes);
        const data = (0, methodParameters_1.buildSwapMethodParameters)(trade, swapConfig).calldata;
        const l1GasUsed = (0, gas_factory_helpers_1.getL2ToL1GasUsed)(data, overhead);
        // l1BaseFee is L1 Gas Price on etherscan
        const l1Fee = l1GasUsed.mul(l1BaseFee);
        const unscaled = l1Fee.mul(scalar);
        // scaled = unscaled / (10 ** decimals)
        const scaledConversion = bignumber_1.BigNumber.from(10).pow(decimals);
        const scaled = unscaled.div(scaledConversion);
        return [l1GasUsed, scaled];
    }
    calculateArbitrumToL1SecurityFee(routes, swapConfig, gasData) {
        const { perL2TxFee, perL1CalldataFee } = gasData;
        const route = routes[0];
        const inputToken = route.tradeType == sdk_core_1.TradeType.EXACT_INPUT
            ? route.amount.currency
            : route.quote.currency;
        const outputToken = route.tradeType == sdk_core_1.TradeType.EXACT_INPUT
            ? route.quote.currency
            : route.amount.currency;
        // build trade for swap calldata
        const trade = (0, methodParameters_1.buildTrade)(inputToken, outputToken, route.tradeType, routes);
        const data = (0, methodParameters_1.buildSwapMethodParameters)(trade, swapConfig).calldata;
        // calculates gas amounts based on bytes of calldata, use 0 as overhead.
        const l1GasUsed = (0, gas_factory_helpers_1.getL2ToL1GasUsed)(data, bignumber_1.BigNumber.from(0));
        // multiply by the fee per calldata and add the flat l2 fee
        let l1Fee = l1GasUsed.mul(perL1CalldataFee);
        l1Fee = l1Fee.add(perL2TxFee);
        return [l1GasUsed, l1Fee];
    }
}
exports.V3HeuristicGasModelFactory = V3HeuristicGasModelFactory;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidjMtaGV1cmlzdGljLWdhcy1tb2RlbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3NyYy9yb3V0ZXJzL2FscGhhLXJvdXRlci9nYXMtbW9kZWxzL3YzL3YzLWhldXJpc3RpYy1nYXMtbW9kZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsd0RBQXFEO0FBQ3JELGdEQUF1RDtBQUV2RCxvREFBdUI7QUFFdkIsbUNBQW1FO0FBS25FLDJDQUEyQztBQUMzQyxzREFBMEQ7QUFDMUQsOEVBSThDO0FBQzlDLDhDQUEyQztBQUMzQyx3RUFHMkM7QUFFM0MsNENBSXNCO0FBRXRCLDJDQUtxQjtBQUVyQjs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FpQkc7QUFDSCxNQUFhLDBCQUEyQixTQUFRLG1DQUF1QjtJQUNyRTtRQUNFLEtBQUssRUFBRSxDQUFDO0lBQ1YsQ0FBQztJQUVNLEtBQUssQ0FBQyxhQUFhLENBQUMsRUFDekIsT0FBTyxFQUNQLFdBQVcsRUFDWCxjQUFjLEVBQUUsWUFBWSxFQUM1QixLQUFLLEVBQ0wsaUJBQWlCLEdBQ2U7UUFHaEMsTUFBTSxTQUFTLEdBQUcsaUJBQWlCO1lBQ2pDLENBQUMsQ0FBQyxNQUFNLGlCQUFpQixDQUFDLFVBQVUsRUFBRTtZQUN0QyxDQUFDLENBQUMsU0FBUyxDQUFDO1FBRWQsTUFBTSxPQUFPLEdBQVMsTUFBTSxJQUFBLGtEQUE0QixFQUN0RCxPQUFPLEVBQ1AsWUFBWSxDQUNiLENBQUM7UUFFRixNQUFNLGtCQUFrQixHQUFHLEtBQUssRUFDOUIsS0FBOEIsRUFLN0IsRUFBRTtZQUNILE1BQU0sV0FBVyxHQUFnQjtnQkFDL0IsU0FBUyxFQUFFLDRDQUE0QztnQkFDdkQsUUFBUSxFQUFFLEdBQUc7Z0JBQ2IsaUJBQWlCLEVBQUUsSUFBSSxrQkFBTyxDQUFDLENBQUMsRUFBRSxLQUFNLENBQUM7YUFDMUMsQ0FBQztZQUNGLElBQUksTUFBTSxHQUFHLHFCQUFTLENBQUMsSUFB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