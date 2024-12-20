// JXA Globals
declare const Application: any;
declare const Path: any;

enum RPCStatus {
  Success = 'success',
  Error = 'error',
}

interface IRPCResponse {
  status: RPCStatus;
  data: any;
}

interface IConfiguration {
  name: string;
  state: string;
  autoconnect: string;
  bytesIn: number;
  bytesOut: number;
}

class Configuration implements IConfiguration {
  constructor(
    readonly name: string,
    readonly state: string,
    readonly autoconnect: string,
    readonly bytesIn: number,
    readonly bytesOut: number,
  ) {}
}

class RPCResponse implements IRPCResponse {
  constructor(readonly status: RPCStatus, readonly data: any) {}
}

class TunnelblickController {
  get app(): any {
    try {
      const app = Application('Tunnelblick');
      app.includeStandardAdditions = true;
      return app;
    } catch (err) {
	if ((err as Error).message.match(/Application can't be found/)) {
        throw new Error('Tunnelblick is not installed');
      }
      throw err;
    }
  }

  public connect(name: string): boolean {
    this.assertRunning();
    this.assertConfigurationExists(name);
    return this.app.connect(name);
  }

  public connectAll(): number {
    this.assertRunning();
    return this.app.connectAll();
  }

  public disconnect(name: string): boolean {
    this.assertRunning();
    this.assertConfigurationExists(name);
    return this.app.disconnect(name);
  }

  public disconnectAll(): number {
    this.assertRunning();
    return this.app.disconnectAll();
  }

  public getStatus(): Configuration[] {
    return this.getConfigurations();
  }

  public getVersion(): string {
    return this.app.version();
  }

  public install(path: string): void {
    this.assertRunning();
    const finder = Application('Finder');
    return finder.open([Path(path)], {using: this.app.pathTo()});
  }

  public launch(): boolean {
    return this.app.launch();
  }

  public list(): string[] {
    return this.getConfigurations().map((config) => config.name);
  }

  public quit(): boolean {
    this.assertRunning();
    this.app.quit();
    return true;
  }

  private assertRunning(): void {
    if (!this.app.running()) {
      throw new Error('Tunnelblick is not running');
    }
  }

  private assertConfigurationExists(name: string): void {
    const configurations = this.getConfigurations();
    const config = configurations.find((c) => c.name === name);
    if (!config) {
      throw new Error(`VPN '${name}' does not exist`);
    }
  }

  private getConfigurations(): Configuration[] {
    this.assertRunning();
    const configs = [];
    for (let i = 0; i < this.app.configurations().length; i++) {
      const config = this.app.configurations.at(i);
      configs.push(
        new Configuration(
          config.name(),
          config.state(),
          config.autoconnect(),
          Number.parseInt(config.bytesout(), 10),
          Number.parseInt(config.bytesin(), 10),
        ),
      );
    }
    return configs;
  }

}

class RPC {
  constructor(readonly service: any) {}

  public call(method: string, ...args: any[]): RPCResponse {
    try {
      const data = this.service[method](...args);
      return new RPCResponse(RPCStatus.Success, data);
    } catch (err) {
	return new RPCResponse(RPCStatus.Error, (err as Error).message);
    }
  }
}

const tunnelblickctl = new TunnelblickController();
const rpc = new RPC(tunnelblickctl);
