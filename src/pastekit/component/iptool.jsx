import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from '../utils/i18n';

// Check if it's a valid IPv4 address
const isValidIPv4 = (ip) => {
    const ipv4Regex = /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipv4Regex.test(ip);
};

// Check if it's a valid IPv6 address
const isValidIPv6 = (ip) => {
    // IPv6 full format: xxxx:xxxx:xxxx:xxxx:xxxx:xxxx:xxxx:xxxx
    // IPv6 compressed format: supports :: to represent consecutive 0 segments
    const ipv6FullRegex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    // Simplified IPv6 compressed format detection
    const ipv6CompressedRegex = /^[0-9a-fA-F:]+$/;
    
    return ipv6FullRegex.test(ip) || ipv6CompressedRegex.test(ip);
};

// Check if it's a valid CIDR format (e.g. 192.168.1.0/24)
const isValidCIDR = (cidr) => {
    const cidrRegex = /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\/([1-9]|[12][0-9]|3[0-2])$/;
    return cidrRegex.test(cidr);
};

// Check if it's a valid IPv6 CIDR format (e.g. 2001:db8::/32)
const isValidIPv6CIDR = (cidr) => {
    const parts = cidr.split('/');
    if (parts.length !== 2) return false;
    
    const [ip, prefix] = parts;
    const prefixNum = parseInt(prefix, 10);
    
    // IPv6 prefix length range is 0-128
    if (prefixNum < 0 || prefixNum > 128) return false;
    
    return isValidIPv6(ip);
};

// Parse CIDR and calculate related information
const parseCIDR = (cidr) => {
    try {
        const [network, prefix] = cidr.split('/');
        const prefixLength = parseInt(prefix, 10);
        
        // Calculate subnet mask
        const mask = Array(32).fill('1').fill('0', prefixLength).join('');
        const maskParts = [
            parseInt(mask.substring(0, 8), 2),
            parseInt(mask.substring(8, 16), 2),
            parseInt(mask.substring(16, 24), 2),
            parseInt(mask.substring(24, 32), 2)
        ];
        const subnetMask = maskParts.join('.');
        
        // Calculate network address
        const ipParts = network.split('.').map(part => parseInt(part, 10));
        const networkAddressParts = [];
        for (let i = 0; i < 4; i++) {
            const octet = ipParts[i].toString(2).padStart(8, '0');
            const maskedOctet = octet.substring(0, Math.floor(prefixLength / 8 + (i === Math.floor(prefixLength / 8) ? prefixLength % 8 : 0))); // Simplified processing
            networkAddressParts.push(parseInt(maskedOctet.padEnd(8, '0'), 2));
        }
        const networkAddress = networkAddressParts.join('.');
        
        // Calculate broadcast address
        const hostBits = 32 - prefixLength;
        // const maxHosts = Math.pow(2, hostBits) - 2; // Subtract network address and broadcast address
        
        // Calculate available IP count
        const totalIPCount = Math.pow(2, hostBits);
        const usableIPCount = totalIPCount - 2; // Subtract network address and broadcast address
        
        // Calculate start and end IPs
        const startIP = [...networkAddressParts];
        startIP[3] += 1; // First available IP
        
        const endIP = [...networkAddressParts];
        const broadcast = [];
        for (let i = 0; i < 4; i++) {
            broadcast.push(~maskParts[i] & 0xFF); // Invert mask to get broadcast address part
        }
        endIP[0] = (networkAddressParts[0] | broadcast[0]) & 0xFF;
        endIP[1] = (networkAddressParts[1] | broadcast[1]) & 0xFF;
        endIP[2] = (networkAddressParts[2] | broadcast[2]) & 0xFF;
        endIP[3] = (networkAddressParts[3] | broadcast[3]) - 1; // Last available IP
        
        return {
            networkAddress,
            subnetMask,
            prefixLength,
            totalIPCount,
            usableIPCount,
            startIP: startIP.join('.'),
            endIP: endIP.join('.'),
            broadcastAddress: [networkAddressParts[0] | broadcast[0], 
                             networkAddressParts[1] | broadcast[1], 
                             networkAddressParts[2] | broadcast[2], 
                             networkAddressParts[3] | broadcast[3]].join('.'),
            error: null
        };
    } catch (e) {
        return {
            error: 'CIDR format parsing failed: ' + e.message
        };
    }
};

// Parse IPv6 CIDR
const parseIPv6CIDR = (cidr) => {
    try {
        const [network, prefix] = cidr.split('/');
        const prefixLength = parseInt(prefix, 10);
        
        // Calculate available address count (simplified processing)
        const hostBits = 128 - prefixLength;
        const totalAddresses = Math.pow(2, hostBits);
        const usableAddresses = totalAddresses > 2 ? totalAddresses - 2 : 0; // Subtract network address and broadcast address
        
        return {
            networkAddress: network,
            prefixLength,
            totalAddresses,
            usableAddresses,
            error: null
        };
    } catch (e) {
        return {
            error: 'IPv6 CIDR format parsing failed: ' + e.message
        };
    }
};

// Get information for a single IP
// Add request caching
const ipInfoCache = new Map();

const getIpInfo = async (ip) => {
    // Check cache
    if (ipInfoCache.has(ip)) {
        console.log(' Getting IP information from cache:', ip);
        return ipInfoCache.get(ip);
    }
    
    try {
        console.log('🌐 Initiating IP information request:', ip);
        // For IPv6 addresses, URL encoding processing is needed
        const encodedIp = encodeURIComponent(ip);
        const response = await fetch(`https://free.freeipapi.com/api/json/${encodedIp}`);
        if (!response.ok) {
            throw new Error(`HTTP error! Status code: ${response.status}`);
        }
        const data = await response.json();
        const result = {
            ...data,
            error: null
        };
        
        // Cache result (set 5 minute expiration)
        ipInfoCache.set(ip, result);
        setTimeout(() => {
            ipInfoCache.delete(ip);
        }, 5 * 60 * 1000);
        
        return result;
    } catch (error) {
        const errorResult = {
            error: 'Failed to get IP information: ' + error.message
        };
        // Also cache errors for a period to avoid frequent retries
        ipInfoCache.set(ip, errorResult);
        setTimeout(() => {
            ipInfoCache.delete(ip);
        }, 60 * 1000);
        
        return errorResult;
    }
};

// Get local machine IP information
const getMyIpInfo = async () => {
    try {
        const response = await fetch('https://free.freeipapi.com/api/json');
        if (!response.ok) {
            throw new Error(`HTTP error! Status code: ${response.status}`);
        }
        const data = await response.json();
        return {
            ...data,
            error: null
        };
    } catch (error) {
        return {
            error: 'Failed to get local IP information: ' + error.message
        };
    }
};

export default function IpTool({ content, showMyIp = true }) {
    const [t] = useTranslation();
    
    console.log('🌐 IpTool rendering:', {
        content: content?.substring(0, 50) + '...',
        hasContent: !!content,
        timestamp: Date.now()
    });

    // If no content, automatically query local IP
    const isEmptyContent = !content || content === undefined || content === null;

    const [results, setResults] = useState({
        original: '',
        type: 'unknown', // 'ipv4', 'ipv6', 'cidr', 'ipv6cidr', 'invalid'
        ipInfo: null,
        cidrInfo: null
    });
    const [error, setError] = useState(null);
    const [myIpInfo, setMyIpInfo] = useState(null);
    const [isFetchingMyIp, setIsFetchingMyIp] = useState(false);
    const [autoQueryDone, setAutoQueryDone] = useState(false);
    const debounceTimerRef = useRef(null);
    const lastProcessedContentRef = useRef('');

    console.log('🔄 IP tool state update:', { hasError: !!error });

    // Core function to process IP content
    const processContent = useCallback(async (inputContent = content) => {
        console.log('🚀 Executing processContent:', {
            content: inputContent?.substring(0, 50) + '...',
            timestamp: Date.now()
        });

        setError(null);
        setResults({
            original: inputContent,
            type: 'unknown',
            ipInfo: null,
            cidrInfo: null
        });

        try {
            const trimmedContent = inputContent?.trim() || '';
            if (!trimmedContent) {
                return;
            }

            const newResults = {
                original: trimmedContent
            };

            // Detect content type and process (by priority)
            if (isValidIPv6CIDR(trimmedContent)) {
                // Is IPv6 CIDR format
                newResults.type = 'ipv6cidr';
                newResults.cidrInfo = parseIPv6CIDR(trimmedContent);
            } else if (isValidCIDR(trimmedContent)) {
                // Is IPv4 CIDR format, perform subnet calculation
                newResults.type = 'cidr';
                newResults.cidrInfo = parseCIDR(trimmedContent);
            } else if (isValidIPv6(trimmedContent)) {
                // Is IPv6 address, get IP information
                newResults.type = 'ipv6';
                newResults.ipInfo = await getIpInfo(trimmedContent);
            } else if (isValidIPv4(trimmedContent)) {
                // Is IPv4 address, get IP information
                newResults.type = 'ipv4';
                newResults.ipInfo = await getIpInfo(trimmedContent);
            } else {
                // Invalid IP format
                newResults.type = 'invalid';
                setError('Input is not a valid IP address or CIDR format');
            }

            setResults(newResults);
        } catch (err) {
            setError(err.message);
        }
    }, []);

    // Function to query local IP
    const handleQueryMyIp = async () => {
        setIsFetchingMyIp(true);
        setError(null);
        
        try {
            const myIpData = await getMyIpInfo();
            setMyIpInfo(myIpData);
            
            // Clear previous results
            setResults({
                original: '',
                type: 'unknown',
                ipInfo: null,
                cidrInfo: null
            });
        } catch (err) {
            setError(err.message);
        } finally {
            setIsFetchingMyIp(false);
        }
    };

    // Debounce handling for content changes (combining initial processing and change monitoring)
    useEffect(() => {
        console.log('🎯 Content change monitoring:', {
            content: content?.substring(0, 50) + '...',
            hasContent: !!content,
            lastProcessed: lastProcessedContentRef.current?.substring(0, 50) + '...',
            timestamp: Date.now()
        });

        // Skip processing if content is empty or unchanged
        if (!content || content === lastProcessedContentRef.current) {
            console.log('⚠️ Content unchanged or empty, skipping processing');
            return;
        }

        console.log('🔍 Debounce triggered:', {content: content.substring(0, 50) + '...', timestamp: Date.now()});

        // Clear previous timers
        if (debounceTimerRef.current) {
            console.log('🧹 Clearing old timer:', debounceTimerRef.current);
            clearTimeout(debounceTimerRef.current);
        }

        // Set new debounce timer
        debounceTimerRef.current = setTimeout(() => {
            console.log('✅ Debounce executing content change:', {
                content: content.substring(0, 50) + '...',
                timestamp: Date.now()
            });
            processContent(content);
            
            // Update last processed content
            lastProcessedContentRef.current = content;
        }, 300);

        console.log('⏰ Setting new timer:', debounceTimerRef.current, 'delay: 300ms');

        // Cleanup function
        return () => {
            if (debounceTimerRef.current) {
                console.log('🧹 Clearing timer on component unmount:', debounceTimerRef.current);
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, [content, processContent]);

    // Automatically query local IP (when content is empty)
    useEffect(() => {
        console.log('🔄 Automatic query useEffect triggered:', {
            isEmptyContent,
            autoQueryDone,
            isFetchingMyIp,
            myIpInfo: !!myIpInfo
        });
        
        if (!autoQueryDone && !isFetchingMyIp) {
            console.log('🔄 Starting automatic local IP query');
            setAutoQueryDone(true);
            handleQueryMyIp();
        }
    }, [isEmptyContent, autoQueryDone, isFetchingMyIp]);

    return (
        <div className="w-full border rounded p-4 space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">{t('components.iptool.title')}</h3>
            </div>
            
            {/* Error notification */}
            {error && (
                <div className="p-3 bg-red-100 text-red-800 rounded text-sm">
                    <strong>{t('components.iptool.processing_error')}:</strong> {error}
                </div>
            )}



            {/* Content IP information display */}
            {content && (
                <>
                    {/* IPv4 address information */}
                    {results.type === 'ipv4' && results.ipInfo && (
                        <div className="space-y-4">
                            <div className="border rounded-lg p-4 bg-blue-50 shadow-sm">
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="font-semibold text-gray-700">{t('components.iptool.ipv4_info')}</h4>
                                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                        {t('components.iptool.query_results')}
                                    </span>
                                </div>
                                {results.ipInfo.error ? (
                                    <div className="text-red-600 text-sm text-center py-2">
                                        {results.ipInfo.error}
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        <div className="flex">
                                            <span className="w-16 text-right text-gray-600 mr-2">{t('components.iptool.ip_address')}:</span>
                                            <span className="font-medium flex-1 min-w-0 truncate">{results.ipInfo.ipAddress}</span>
                                        </div>
                                        <div className="flex">
                                            <span className="w-16 text-right text-gray-600 mr-2">{t('components.iptool.country')}:</span>
                                            <span className="font-medium flex-1 min-w-0 truncate">{results.ipInfo.countryName}</span>
                                        </div>
                                        <div className="flex">
                                            <span className="w-16 text-right text-gray-600 mr-2">{t('components.iptool.province')}:</span>
                                            <span className="font-medium flex-1 min-w-0 truncate">{results.ipInfo.regionName}</span>
                                        </div>
                                        <div className="flex">
                                            <span className="w-16 text-right text-gray-600 mr-2">{t('components.iptool.city')}:</span>
                                            <span className="font-medium flex-1 min-w-0 truncate">{results.ipInfo.cityName}</span>
                                        </div>
                                        <div className="flex">
                                            <span className="w-16 text-right text-gray-600 mr-2">{t('components.iptool.latitude')}:</span>
                                            <span className="font-medium flex-1 min-w-0 truncate">{results.ipInfo.latitude}</span>
                                        </div>
                                        <div className="flex">
                                            <span className="w-16 text-right text-gray-600 mr-2">{t('components.iptool.longitude')}:</span>
                                            <span className="font-medium flex-1 min-w-0 truncate">{results.ipInfo.longitude}</span>
                                        </div>
                                        <div className="flex">
                                            <span className="w-16 text-right text-gray-600 mr-2">{t('components.iptool.isp')}:</span>
                                            <span className="font-medium flex-1 min-w-0 truncate">{results.ipInfo.isp}</span>
                                        </div>
                                        <div className="flex">
                                            <span className="w-16 text-right text-gray-600 mr-2">{t('components.iptool.organization')}:</span>
                                            <span className="font-medium flex-1 min-w-0 truncate">{results.ipInfo.organization}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    
                    {/* IPv6 address information */}
                    {results.type === 'ipv6' && results.ipInfo && (
                        <div className="space-y-4">
                            <div className="border rounded-lg p-4 bg-purple-50 shadow-sm">
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="font-semibold text-gray-700">{t('components.iptool.ipv6_info')}</h4>
                                    <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                                        {t('components.iptool.query_results')}
                                    </span>
                                </div>
                                {results.ipInfo.error ? (
                                    <div className="text-red-600 text-sm text-center py-2">
                                        {results.ipInfo.error}
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        <div className="flex">
                                            <span className="w-16 text-right text-gray-600 mr-2">{t('components.iptool.ip_address')}:</span>
                                            <span className="font-medium flex-1 min-w-0 truncate">{results.ipInfo.ipAddress}</span>
                                        </div>
                                        <div className="flex">
                                            <span className="w-16 text-right text-gray-600 mr-2">{t('components.iptool.country')}:</span>
                                            <span className="font-medium flex-1 min-w-0 truncate">{results.ipInfo.countryName}</span>
                                        </div>
                                        <div className="flex">
                                            <span className="w-16 text-right text-gray-600 mr-2">{t('components.iptool.province')}:</span>
                                            <span className="font-medium flex-1 min-w-0 truncate">{results.ipInfo.regionName}</span>
                                        </div>
                                        <div className="flex">
                                            <span className="w-16 text-right text-gray-600 mr-2">{t('components.iptool.city')}:</span>
                                            <span className="font-medium flex-1 min-w-0 truncate">{results.ipInfo.cityName}</span>
                                        </div>
                                        <div className="flex">
                                            <span className="w-16 text-right text-gray-600 mr-2">{t('components.iptool.latitude')}:</span>
                                            <span className="font-medium flex-1 min-w-0 truncate">{results.ipInfo.latitude}</span>
                                        </div>
                                        <div className="flex">
                                            <span className="w-16 text-right text-gray-600 mr-2">{t('components.iptool.longitude')}:</span>
                                            <span className="font-medium flex-1 min-w-0 truncate">{results.ipInfo.longitude}</span>
                                        </div>
                                        <div className="flex">
                                            <span className="w-16 text-right text-gray-600 mr-2">{t('components.iptool.isp')}:</span>
                                            <span className="font-medium flex-1 min-w-0 truncate">{results.ipInfo.isp}</span>
                                        </div>
                                        <div className="flex">
                                            <span className="w-16 text-right text-gray-600 mr-2">{t('components.iptool.organization')}:</span>
                                            <span className="font-medium flex-1 min-w-0 truncate">{results.ipInfo.organization}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    
                    {/* Invalid input notification */}
                    {results.type === 'invalid' && !error && (
                        <div className="text-center text-gray-500 py-6">
                            <div className="text-3xl mb-2">❌</div>
                            <div className="font-medium">{t('components.iptool.invalid_input')}</div>
                            <div className="text-sm mt-1 text-gray-400">{t('components.iptool.example')} 221.111.111.111 {t('components.iptool.or')} 2001:db8::1 {t('components.iptool.or')} 192.168.1.0/24</div>
                        </div>
                    )}
                </>
            )}
            
            {/* IPv4 CIDR calculation results */}
            {results.type === 'cidr' && results.cidrInfo && (
                <div className="space-y-4">
                    <div className="border rounded p-3 bg-green-50">
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-sm text-gray-700">{t('components.iptool.ipv4_subnet')}</h4>
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                {t('components.iptool.ipv4_cidr')}
                            </span>
                        </div>
                        {results.cidrInfo.error ? (
                            <div className="text-xs text-red-600">
                                {results.cidrInfo.error}
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-3 text-xs">
                                <div><strong>{t('components.iptool.network_address')}:</strong> {results.cidrInfo.networkAddress}</div>
                                <div><strong>{t('components.iptool.subnet_mask')}:</strong> {results.cidrInfo.subnetMask}</div>
                                <div><strong>{t('components.iptool.cidr_prefix')}:</strong> /{results.cidrInfo.prefixLength}</div>
                                <div><strong>{t('components.iptool.total_ips')}:</strong> {results.cidrInfo.totalIPCount}</div>
                                <div><strong>{t('components.iptool.available_ips')}:</strong> {results.cidrInfo.usableIPCount}</div>
                                <div><strong>{t('components.iptool.start_ip')}:</strong> {results.cidrInfo.startIP}</div>
                                <div><strong>{t('components.iptool.end_ip')}:</strong> {results.cidrInfo.endIP}</div>
                                <div><strong>{t('components.iptool.broadcast_address')}:</strong> {results.cidrInfo.broadcastAddress}</div>
                            </div>
                        )}
                    </div>
                </div>
            )}
            
            {/* IPv6 CIDR calculation results */}
            {results.type === 'ipv6cidr' && results.cidrInfo && (
                <div className="space-y-4">
                    <div className="border rounded p-3 bg-indigo-50">
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-sm text-gray-700">{t('components.iptool.ipv6_subnet')}</h4>
                            <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded">
                                {t('components.iptool.ipv6_cidr')}
                            </span>
                        </div>
                        {results.cidrInfo.error ? (
                            <div className="text-xs text-red-600">
                                {results.cidrInfo.error}
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-3 text-xs">
                                <div className="break-all"><strong>{t('components.iptool.network_address')}:</strong> {results.cidrInfo.networkAddress}</div>
                                <div><strong>{t('components.iptool.cidr_prefix')}:</strong> /{results.cidrInfo.prefixLength}</div>
                                <div><strong>{t('components.iptool.total_addresses')}:</strong> {results.cidrInfo.totalAddresses}</div>
                                <div><strong>{t('components.iptool.available_addresses')}:</strong> {results.cidrInfo.usableAddresses}</div>
                            </div>
                        )}
                    </div>
                </div>
            )}
            
            {results.type === 'invalid' && !error && (
                <div className="text-center text-gray-500 py-8">
                    <div className="text-4xl mb-2">❌</div>
                    <div>{t('components.iptool.invalid_input')}</div>
                    <div className="text-sm mt-1">{t('components.iptool.example')} 221.111.111.111 {t('components.iptool.or')} 2001:db8::1 {t('components.iptool.or')} 192.168.1.0/24 {t('components.iptool.or')} 2001:db8::/32</div>
                </div>
            )}
            {/* Local IP display */}
            {showMyIp && myIpInfo && (
                <div className="space-y-4">
                    <div className="border rounded-lg p-4 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold text-gray-700">{t('components.iptool.local_ip')}</h4>
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                {t('components.iptool.auto_acquired')}
                            </span>
                        </div>

                        {myIpInfo.error ? (
                            <div className="text-red-600 text-sm text-center py-2">
                                ❌ {myIpInfo.error}
                            </div>
                        ) : (
                            <div className="text-center">
                                <div className="text-2xl font-mono font-bold text-gray-800 mb-1 max-w-full break-all overflow-x-auto">
                                    {myIpInfo.ipAddress}
                                </div>
                                <div className="text-xs text-gray-600">
                                    {t('components.iptool.ipv_version', { version: myIpInfo.ipVersion })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
            
            {/* Empty state notification */}
            {!content && !myIpInfo && !isFetchingMyIp && (
                <div className="text-center text-gray-500 py-8">
                    <div className="text-4xl mb-2">🌐</div>
                    <div>{t('components.iptool.auto_querying')}</div>
                    <div className="text-sm mt-1">{t('components.iptool.support_desc')}</div>
                </div>
            )}
        </div>
    );
}