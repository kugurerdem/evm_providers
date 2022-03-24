export default class ABIProvider{
    public abis : {
        [ abi_name : string] : any[]
    };
    
    constructor(){
        this.abis = {};
    }

    /**
     * General ABI, All 
     * @param abi_name 
     * @param abi 
     */
    public addABI(abi_name : string, abi : any[]){
        this.abis[abi_name] = abi;
    }
}