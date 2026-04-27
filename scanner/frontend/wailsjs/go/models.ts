export namespace main {

	export class ScanRequest {
	    baseIP: string;
	    startIP: number;
	    endIP: number;
	    startPort: number;
	    endPort: number;
	    timeout: number;
	    connections: number;
	    random: boolean;
	    scanType: number;

	    static createFrom(source: any = {}) {
	        return new ScanRequest(source);
	    }

	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.baseIP = source["baseIP"];
	        this.startIP = source["startIP"];
	        this.endIP = source["endIP"];
	        this.startPort = source["startPort"];
	        this.endPort = source["endPort"];
	        this.timeout = source["timeout"];
	        this.connections = source["connections"];
	        this.random = source["random"];
	        this.scanType = source["scanType"];
	    }
	}

}
