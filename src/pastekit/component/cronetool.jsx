import ReactDOM from "react-dom/client";
import {Cron} from 'croner';
import { useTranslation } from '../utils/i18n';

const formatToYMDHMS = (date) => {
    if (!(date instanceof Date) || isNaN(date.getTime())) return null;
    const pad = (n) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

const isValidCron = (str) => {
    if (typeof str !== 'string' || !str.trim()) return false;
    const parts = str.trim().split(/\s+/);
    const len = parts.length;
    return (len === 5 || len === 6) && parts.every(p => /^[\d*,\/\-LW#?]+$/.test(p));
};

export default function CronTool({cronExpr}) {
    const [t] = useTranslation();
    
    console.info("Cron utilities " + cronExpr)
    const generateNextRuns = (expr, count = 5) => {
        if (!isValidCron(expr)) {
            return {error: '(Input does not match basic Cron expression format)'};
        }
        console.info("Cron " + cronExpr);

        try {
            // ✅ Using Croner
            const job = new Cron(expr, {
                paused: true,     // Not actually scheduled
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone // Using local timezone
            });

            const runs = [];
            let next = job.nextRun();
            for (let i = 0; i < count && next; i++) {
                runs.push(formatToYMDHMS(next));
                next = job.nextRun(next); // Continue calculation from last time
            }

            job.stop(); // Cleanup
            return {runs};
        } catch (err) {
            console.error('Croner error:', err);
            return {error: `(无效 Cron: ${err.message})`};
        }
    };

    const result = typeof cronExpr === 'string'
        ? generateNextRuns(cronExpr)
        : {error: '(Input is not a string)'};

    const {runs, error} = result;

    return (
        <div>
            {isValidCron(cronExpr) && (
                <div className="w-full border rounded p-4">
                    <h3 className="text-lg font-bold mb-2">{t('components.cronetool.title')}</h3>
                    <div>
                        <p className="text-red-500">{error}</p>
                        <ul className="list-disc pl-5 space-y-1">
                            {runs.map((time, i) => (
                                <li key={i} className="font-mono">{time}</li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
}

// 测试
// const root = ReactDOM.createRoot(document.getElementById("root"));
// root.render(<CronTool cronExpr="*/5 * * * *"/>);