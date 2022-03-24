import { ethers } from "ethers";
import EVMProvider from "./EVMProvider";

/**
 * @author kugurerdem
 * @date 20.03.2022
 */
export default class EVMContract{
    private evmProvider: EVMProvider;
    private contract: ethers.Contract;

    constructor(address: string, abi: any[], evmProvider: EVMProvider){
        this.contract = new ethers.Contract(address, abi);
        this.evmProvider = evmProvider;
    }

    async read( method_name: string, ...inputs: any[] ){
        return this.evmProvider.iterateProviders( (provider) => {
            // SET THE CONTRACT
            const contract = this.contract.connect(provider);
            
            // GET THE RESULT OF THE CONTRACT METHOD CALL
            return contract.functions[method_name](...inputs)
        })
    }

    /**
     * Creates an EventFilter to be used later by queryFilter
     * // https://docs.ethers.io/v5/concepts/events/
     * @param event_name 
     * @param topics 
     * @returns ethers.EventFilter
     */
    filter(event_name : string, ...topics : any[]){
        return this.contract.filters[event_name](...topics);
    }

    /**
     * Given a filter, queries it.
     * @param filter 
     * @param fromBlock 
     * @param toBlock 
     * @returns 
     */
    async queryFilter(
        filter : ethers.EventFilter,    
        fromBlock?: ethers.providers.BlockTag | undefined,
        toBlock?: ethers.providers.BlockTag | undefined
    ){
        return this.evmProvider.iterateProviders( async (provider : ethers.providers.BaseProvider) => {
            const contract =  this.contract.connect(provider);
            return contract.queryFilter(filter, fromBlock, toBlock);
        })
    }
}