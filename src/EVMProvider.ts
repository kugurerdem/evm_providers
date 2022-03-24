import { ethers } from "ethers";
import EVMContract from "./EVMContract";

export type ChainData = {
    name: string,
    rpc: string[],
    chain_id : number
}

/**
 * This class acts as a Facade between ethers library and our calls
 * @author kugurerdem
 * @date 09.03.2022
 * @update 20.03.2022
 */
export default class EVMProvider{
    private name : string;
    private rpcs : string[];
    private chain_id : number;

    private providers : ethers.providers.JsonRpcProvider[];
    private contracts : {
        [contract_addr : string] : EVMContract
    };

    public constructor(chain_data : ChainData){
        // ASSIGN CHAIN_DATA 
        this.name = chain_data.name;
        this.rpcs = chain_data.rpc;
        this.chain_id = chain_data.chain_id;

        // CREATE ETHERS PROVIDERS
        this.providers = [];
        for(const rpc of this.rpcs){
            this.providers.push( 
                new ethers.providers.JsonRpcProvider(rpc) 
            );
        }

        // CONTRACTS & ABIS
        this.contracts = {};
    }

    /**
    * 
    * @param call_data 
    * @example {
    *   contract_address : "0xc7198437980c041c805a1edcba50c1ce5db95118"
    *   method_name : "balanceOf"
    *   inputs : ["0x078dD3a28D9908d38424980944319431462A5aB6"]
    * }
    */
    async readContract( call_data : { 
        address: string, 
        abi: any[];
        method_name: string, 
        inputs: any[] 
    }){
        const {address, method_name, inputs, abi} = call_data;
        
        let contract = this.contracts[address];
        if(!contract) 
            contract = new EVMContract(address, abi, this);
        
        return contract.read(method_name, ...inputs)
    }

    /**
     * Creates an EVMContract to be used for later
     * @param contract_address 
     * @param contract_abi 
     */
     public addContract(contract_address : string, contract_abi : any[]) : void{
        this.contracts[contract_address] = new EVMContract(contract_address, contract_abi, this);
    }

    /**
     * Returns an EVMContract if it is registered
     * @param address 
     * @returns 
     */
    getContract(address : string) : EVMContract{
        return this.contracts[address];
    }

    /**
     * Queries the event logs
     */
    public async getLogs(filter : ethers.providers.Filter) : Promise<ethers.providers.Log[]>{
        return this.iterateProviders( async (provider : ethers.providers.BaseProvider) => {
            return provider.getLogs(filter);
        })
    }

    async getBlockNumber() : Promise<number>{
        return this.iterateProviders(async (provider : ethers.providers.BaseProvider) => {
            return provider.getBlockNumber();
        })
    }

    async getBlock(block_tag : ethers.providers.BlockTag) : Promise<ethers.providers.Block>{
        return this.iterateProviders(async (provider : ethers.providers.BaseProvider) => {
            return provider.getBlock(block_tag)
        })
    }

    // EVMProvider.getBlockWithTS(time_stamp : ) : blocknumber
    async getBlockWithTS(time_stamp : number) : Promise<ethers.providers.Block>{
        const block_number = await this.getBlockNumber();
        return this._getBlockWithTS(time_stamp, 0, block_number);
    }

    private async _getBlockWithTS(
        time_stamp : number, 
        start_block_number : number, 
        end_block_number : number
    ) : Promise<ethers.providers.Block>{
        // IF THE BASE CASE
        if(end_block_number - start_block_number <= 1){
            const [start_block, end_block] = await Promise.all([ 
                this.getBlock(start_block_number), 
                this.getBlock(end_block_number)]
            );
            
            if( Math.abs(time_stamp - start_block.timestamp) > Math.abs(time_stamp - end_block.timestamp))
                return end_block;
            return start_block;
        }

        // IF NOT THE BASE CASE
        const median_block_number = Math.round( (start_block_number + end_block_number) / 2);
        const block_time_stamp = (await this.getBlock(median_block_number)).timestamp;
        
        if(block_time_stamp > time_stamp)
            return this._getBlockWithTS(time_stamp, start_block_number, median_block_number);
        return this._getBlockWithTS(time_stamp, median_block_number, end_block_number);
    }
    
    async getDailyBlockNumber() : Promise<number>{
        const ts = Math.round( Date.now() / 1000 - (24*60*60) ); // timestamp of the 24hr before

        const [{number : yesterday_block_number}, block_number] = await Promise.all([
            this.getBlockWithTS(ts),
            this.getBlockNumber()
        ])

        return block_number - yesterday_block_number;
    }

    /**
     * Given a request, iterates through providers to make sure that in case one provider is not working we use other providers
     * @param getResult - this is a function that uses provider and returns the desired Promise
     * @returns 
     */
    async iterateProviders(getResult : (provider: ethers.providers.BaseProvider) => Promise<any>) : Promise<any>
    {
        // ITERATE THROUGH PROVIDERS UNTIL THE JOB IS DONE
        for(const provider of this.providers){
            let result = await getResult(provider)
                .then( (value) => {
                    return value;
                })
                .catch(e => {
                    console.log(e.message);
                    return; // undefined
                });

            // IF THE VALUE IS FOUND WITHOUT PROBLEM CLOSE THE LOOP & FUNCTION
            if(result)
                return result;
        }
        return;
    }

    /**
     * logs -> transaction receipts adapter
     * @param logs 
     * @returns 
     */
    private async logs2TxReceipts( logs : ethers.providers.Log[] ) : Promise<ethers.providers.TransactionReceipt[]>{
        const txHashes : string[] = logs.map( log => {
            return log.transactionHash;
        })

        const txReceipts = [];
        for(const txHash of txHashes){;
            const txReceipt = this.iterateProviders((provider) => {
                return provider.getTransactionReceipt(txHash);
            })
            
            txReceipts.push(txReceipt);
        }

        return Promise.all(txReceipts);
    }

    public getName() : string{
        return this.name;
    }
}