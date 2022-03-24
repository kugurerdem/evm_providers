import ethers from 'ethers';

/**
 * Parses the fetched logs using an event signature
 * @param logs : result of the getLogs function
 * @param event_signature : e.g. "event Transfer(address indexed from, address indexed to, uint value)""
 * @returns LogDescription[]
 */
export function parseLogs( logs : ethers.providers.Log[], event_signature : string) : ethers.utils.LogDescription[]{
    const abi = [event_signature];
    const iface = new ethers.utils.Interface(abi);

    const parsed_logs = logs.map( log => iface.parseLog(log) );
    return parsed_logs;
}