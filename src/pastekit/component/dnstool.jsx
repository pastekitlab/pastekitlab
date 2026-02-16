import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from '../utils/i18n';

// Check if it's a valid domain format
const isValidDomain = (domain) => {
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;
    return domainRegex.test(domain.trim());
};

// DNS query function - supports IPv4, IPv6 and CNAME records
const queryDNS = async (domain) => {
    try {
        // Parallel query for A records (IPv4), AAAA records (IPv6) and CNAME records
        const [aResponse, aaaaResponse, cnameResponse] = await Promise.all([
            fetch(`https://dns.alidns.com/resolve?name=${encodeURIComponent(domain)}&type=A`),
            fetch(`https://dns.alidns.com/resolve?name=${encodeURIComponent(domain)}&type=AAAA`),
            fetch(`https://dns.alidns.com/resolve?name=${encodeURIComponent(domain)}&type=CNAME`)
        ]);

        let allRecords = [];
        let errors = [];

        // Process A record response
        if (aResponse.ok) {
            const aData = await aResponse.json();
            if (aData.Answer) {
                allRecords = [...allRecords, ...aData.Answer];
            }
        } else {
            errors.push(`A record query failed: ${aResponse.status}`);
        }

        // Process AAAA record response
        if (aaaaResponse.ok) {
            const aaaaData = await aaaaResponse.json();
            if (aaaaData.Answer) {
                allRecords = [...allRecords, ...aaaaData.Answer];
            }
        } else {
            errors.push(`AAAA record query failed: ${aaaaResponse.status}`);
        }

        // Process CNAME record response
        if (cnameResponse.ok) {
            const cnameData = await cnameResponse.json();
            if (cnameData.Answer) {
                allRecords = [...allRecords, ...cnameData.Answer];
            }
        } else {
            errors.push(`CNAME record query failed: ${cnameResponse.status}`);
        }

        // Return successful result if there are records
        if (allRecords.length > 0) {
            return {
                Answer: allRecords,
                error: null
            };
        }

        // If no records but request succeeded, return no records
        if (errors.length === 0) {
            return {
                Answer: null,
                error: 'No resolution records'
            };
        }

        // If all have errors, return the first error
        return {
            Answer: null,
            error: errors.join('; ')
        };

    } catch (error) {
        return {
            Answer: null,
            error: 'DNS query failed: ' + error.message
        };
    }
};

// Parse DNS response data
const parseDNSResponse = (data) => {
    if (!data || !data.Answer) {
        return {
            records: [],
            error: 'No resolution records'
        };
    }

    const records = data.Answer.map(item => {
        // Set label and background color based on record type
        let typeLabel = '';
        let bgColor = '';
        
        switch (item.type) {
            case 1: // A record
                typeLabel = 'IPv4';
                bgColor = 'bg-green-100 text-green-800';
                break;
            case 28: // AAAA record
                typeLabel = 'IPv6';
                bgColor = 'bg-blue-100 text-blue-800';
                break;
            case 5: // CNAME record
                typeLabel = 'CNAME';
                bgColor = 'bg-purple-100 text-purple-800';
                break;
            default:
                typeLabel = `TYPE-${item.type}`;
                bgColor = 'bg-gray-100 text-gray-800';
        }
        
        return {
            name: item.name,
            type: item.type,
            typeLabel,
            ttl: item.TTL,
            data: item.data,
            bgColor
        };
    });

    // Sort by priority: CNAME(5) > IPv4(1) > IPv6(28)
    const sortedRecords = [...records].sort((a, b) => {
        const priority = { 5: 1, 1: 2, 28: 3 }; // CNAME highest priority, IPv4 second, IPv6 lowest
        const priorityA = priority[a.type] || 999;
        const priorityB = priority[b.type] || 999;
        return priorityA - priorityB;
    });

    return {
        records: sortedRecords,
        error: null
    };
};

export default function DnsTool({ content }) {
    const [t] = useTranslation();
    
    console.log('🌐 DnsTool rendering:', {
        content: content?.substring(0, 50) + '...',
        hasContent: !!content,
        timestamp: Date.now()
    });

    // Don't display component if no content
    if (!content || content === undefined || content === null) {
        return null;
    }

    const [results, setResults] = useState({
        original: '',
        records: [],
        isLoading: false,
        error: null
    });
    const debounceTimerRef = useRef(null);
    const lastProcessedContentRef = useRef('');

    console.log('🔄 DNS tool state update:', { hasError: !!results.error });

    // Core function to process domain query
    const processContent = useCallback(async (inputContent = content) => {
        console.log('🚀 Executing processContent:', {
            content: inputContent?.substring(0, 50) + '...',
            timestamp: Date.now()
        });

        setResults(prev => ({
            ...prev,
            isLoading: true,
            error: null
        }));

        try {
            const trimmedContent = inputContent?.trim() || '';
            if (!trimmedContent) {
                setResults({
                    original: '',
                    records: [],
                    isLoading: false,
                    error: null
                });
                return;
            }

            // Validate domain format
            if (!isValidDomain(trimmedContent)) {
                setResults({
                    original: trimmedContent,
                    records: [],
                    isLoading: false,
                    error: 'Please enter a valid domain format'
                });
                return;
            }

            // Execute DNS query
            const dnsData = await queryDNS(trimmedContent);
            
            if (dnsData.error) {
                setResults({
                    original: trimmedContent,
                    records: [],
                    isLoading: false,
                    error: dnsData.error
                });
                return;
            }

            // Parse response data
            const parsedData = parseDNSResponse(dnsData);
            
            setResults({
                original: trimmedContent,
                records: parsedData.records,
                isLoading: false,
                error: parsedData.error
            });

        } catch (err) {
            setResults({
                original: inputContent,
                records: [],
                isLoading: false,
                error: err.message
            });
        }
    }, []);

    // Debounce handling for content changes
    useEffect(() => {
        console.log('🎯 Content change monitoring:', {
            content: content?.substring(0, 50) + '...',
            hasContent: !!content,
            lastProcessed: lastProcessedContentRef.current?.substring(0, 50) + '...',
            timestamp: Date.now()
        });

        if (!content || content === lastProcessedContentRef.current) {
            console.log('⚠️ Content unchanged or empty, skipping debounce processing');
            return;
        }

        console.log('🔍 Debounce triggered:', {content: content.substring(0, 50) + '...', timestamp: Date.now()});

        if (debounceTimerRef.current) {
            console.log('🧹 Clearing old timer:', debounceTimerRef.current);
            clearTimeout(debounceTimerRef.current);
        }

        debounceTimerRef.current = setTimeout(() => {
            console.log('✅ Debounce executing content change:', {
                content: content.substring(0, 50) + '...',
                timestamp: Date.now()
            });
            processContent(content);
            
            // Update last processed content
            lastProcessedContentRef.current = content;
        }, 500);

        console.log('⏰ Setting new timer:', debounceTimerRef.current, 'delay: 500ms');

        return () => {
            if (debounceTimerRef.current) {
                console.log('🧹 Clearing timer on component unmount:', debounceTimerRef.current);
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, [content, processContent]);

    // 初始处理
    useEffect(() => {
        if (content && content !== lastProcessedContentRef.current) {
            processContent(content);
            lastProcessedContentRef.current = content;
        }
    }, [content, processContent]);

    return (
        <div>
            <div className="w-full border rounded p-4 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold">🌐 DNS Resolution Tool</h3>
                </div>
                
                {/* Error notification */}
                {results.error && (
                    <div className="p-3 bg-red-100 text-red-800 rounded text-sm">
                        <strong>Query error:</strong> {results.error}
                    </div>
                )}

                {/* Loading state */}
                {results.isLoading && (
                    <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mr-3"></div>
                        <span className="text-gray-600">Querying DNS records...</span>
                    </div>
                )}

                {/* DNS resolution results */}
                {!results.isLoading && results.records.length > 0 && (
                    <div className="space-y-4">
                        <div className="border rounded-lg p-4 bg-gradient-to-r from-blue-50 to-indigo-50">
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="font-semibold text-gray-700">{t('components.dnstool.results_title')}</h4>
                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                    🌐 {results.original}
                                </span>
                            </div>
                            
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-gray-100">
                                            <th className="text-left py-2 px-3 font-medium text-gray-700">{t('components.dnstool.record_type')}</th>
                                            <th className="text-left py-2 px-3 font-medium text-gray-700">{t('components.dnstool.ttl')}</th>
                                            <th className="text-left py-2 px-3 font-medium text-gray-700">{t('components.dnstool.resolution_address')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {results.records.map((record, index) => (
                                            <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                                                <td className="py-2 px-3 font-medium text-gray-800">
                                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${record.bgColor}`}>
                                                        {record.typeLabel}
                                                    </span>
                                                </td>
                                                <td className="py-2 px-3 text-gray-600">{record.ttl}s</td>
                                                <td className="py-2 px-3">
                                                    <div className="font-mono text-gray-800 bg-gray-50 rounded px-2 py-1 break-all">
                                                        {record.data}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            
                            {/* Statistics */}
                            <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500">
                                <span>{t('components.dnstool.ipv4_records')}: {results.records.filter(r => r.type === 1).length}</span>
                                <span>{t('components.dnstool.ipv6_records')}: {results.records.filter(r => r.type === 28).length}</span>
                                <span>{t('components.dnstool.cname_records')}: {results.records.filter(r => r.type === 5).length}</span>
                                <span>{t('components.dnstool.total_records', { count: results.records.length })}</span>
                            </div>
                            
                            <div className="mt-3 text-xs text-gray-500">
                                {t('components.dnstool.found_records', { count: results.records.length })}
                            </div>
                        </div>
                    </div>
                )}

                {/* Invalid domain notification */}
                {!results.isLoading && results.records.length === 0 && !results.error && results.original && (
                    <div className="text-center text-gray-500 py-8">
                        <div className="text-4xl mb-2">🔍</div>
                        <div>{t('components.dnstool.no_records_found', { domain: results.original })}</div>
                        <div className="text-sm mt-1">{t('components.dnstool.check_spelling')}</div>
                    </div>
                )}

                {/* Empty state notification */}
                {!content && (
                    <div className="text-center text-gray-500 py-8">
                        <div className="text-4xl mb-2">🌐</div>
                        <div>{t('components.dnstool.enter_domain')}</div>
                        <div className="text-sm mt-1">{t('components.dnstool.example_domains')}</div>
                    </div>
                )}
            </div>
        </div>
    );
}