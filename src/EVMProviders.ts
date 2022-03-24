import EVMProvider from "./EVMProvider";

export default class EVMProviders{
    private static instance : EVMProviders;

    evmProviders : {
        [key : string] : EVMProvider
    };
    
    private constructor(){
        this.evmProviders = {};
    }

    public static getInstance(){
        if(!this.instance) this.instance = new EVMProviders();
        return this.instance;
    }

    getChainProvider(chain_name: string) {
        return this.evmProviders[chain_name];
    }
   
    addProvider(provider: EVMProvider){
        this.evmProviders[ provider.getName() ] = provider;
    }

    listProviders(){
        for(const [name, provider] of Object.entries(this.evmProviders)){
            console.log(`${name} : ${provider}`);
        }
    }
}