import { useState, useEffect } from 'react';
import { useTranslation } from '../utils/i18n';

const WorldClock = () => {
    const [t] = useTranslation();
    const [timeData, setTimeData] = useState({
        beijing: '',
        london: '',
        sydney: '',
        newYork: ''
    });

    useEffect(() => {
        const updateTime = () => {
            const now = new Date();
            
            // Beijing Time (UTC+8) - Combined datetime format
            const beijingDateTime = new Intl.DateTimeFormat('sv-SE', {
                timeZone: 'Asia/Shanghai',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            }).format(now).replace(/ /g, ' ').replace(/\//g, '-');
            
            // London Time (UTC+0/+1) - Combined datetime format
            const londonDateTime = new Intl.DateTimeFormat('sv-SE', {
                timeZone: 'Europe/London',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            }).format(now).replace(/ /g, ' ').replace(/\//g, '-');
            
            // Sydney Time (UTC+10/+11) - Combined datetime format
            const sydneyDateTime = new Intl.DateTimeFormat('sv-SE', {
                timeZone: 'Australia/Sydney',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            }).format(now).replace(/ /g, ' ').replace(/\//g, '-');
            
            // New York Time (UTC-5/-4) - Combined datetime format
            const newYorkDateTime = new Intl.DateTimeFormat('sv-SE', {
                timeZone: 'America/New_York',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            }).format(now).replace(/ /g, ' ').replace(/\//g, '-');
            
            setTimeData({
                beijing: beijingDateTime,
                london: londonDateTime,
                sydney: sydneyDateTime,
                newYork: newYorkDateTime
            });
        };
        
        // Update immediately
        updateTime();
        
        // Update every second
        const interval = setInterval(updateTime, 1000);
        
        // Cleanup interval on unmount
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="px-3 py-1 bg-blue-50 border-b h-24">
            <div className="text-xs font-medium text-gray-700 mb-1">{t('components.worldclock.title')}</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center">
                    <span className="w-2 h-2 rounded-full bg-purple-500 mr-2"></span>
                    <span className="text-gray-600 w-16">{t('components.worldclock.new_york')}:</span>
                    <span className="font-mono">{timeData.newYork}</span>
                </div>
                <div className="flex items-center">
                    <span className="w-2 h-2 rounded-full bg-red-500 mr-2"></span>
                    <span className="text-gray-600 w-16">{t('components.worldclock.beijing')}:</span>
                    <span className="font-mono">{timeData.beijing}</span>
                </div>
                <div className="flex items-center">
                    <span className="w-2 h-2 rounded-full bg-blue-500 mr-2"></span>
                    <span className="text-gray-600 w-16">{t('components.worldclock.london')}:</span>
                    <span className="font-mono">{timeData.london}</span>
                </div>
                <div className="flex items-center">
                    <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
                    <span className="text-gray-600 w-16">{t('components.worldclock.sydney')}:</span>
                    <span className="font-mono">{timeData.sydney}</span>
                </div>

            </div>
        </div>
    );
};

export default WorldClock;