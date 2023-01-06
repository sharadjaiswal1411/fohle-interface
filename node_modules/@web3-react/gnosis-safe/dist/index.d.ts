import type { SafeAppProvider } from '@gnosis.pm/safe-apps-provider';
import type SafeAppsSDK from '@gnosis.pm/safe-apps-sdk';
import type { Opts } from '@gnosis.pm/safe-apps-sdk';
import type { Actions } from '@web3-react/types';
import { Connector } from '@web3-react/types';
export declare class NoSafeContext extends Error {
    constructor();
}
/**
 * @param options - Options to pass to `@gnosis.pm/safe-apps-sdk`.
 */
export interface GnosisSafeConstructorArgs {
    actions: Actions;
    options?: Opts;
}
export declare class GnosisSafe extends Connector {
    /** {@inheritdoc Connector.provider} */
    provider?: SafeAppProvider;
    private readonly options?;
    private eagerConnection?;
    /**
     * A `SafeAppsSDK` instance.
     */
    sdk: SafeAppsSDK | undefined;
    constructor({ actions, options }: GnosisSafeConstructorArgs);
    /**
     * A function to determine whether or not this code is executing on a server.
     */
    private get serverSide();
    /**
     * A function to determine whether or not this code is executing in an iframe.
     */
    private get inIframe();
    private isomorphicInitialize;
    /** {@inheritdoc Connector.connectEagerly} */
    connectEagerly(): Promise<void>;
    activate(): Promise<void>;
}
