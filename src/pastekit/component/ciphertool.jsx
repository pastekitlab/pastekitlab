import React, { useEffect, useState, useRef } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

// 支持的算法/模式/填充
const ALGORITHMS = ['AES', 'SM4', 'RSA'];
// 扩展 AES/SM4 常见模式（注意：CryptoJS 不支持 GCM 模式）
const MODE_MAP = {
  AES: ['CBC', 'ECB', 'CFB', 'OFB', 'CTR'],
  SM4: ['CBC', 'ECB', 'CFB', 'OFB', 'CTR'],
  RSA: []
};
// 仅对需要填充的模式显示填充选项（例如 CBC/ECB 需要填充，GCM/CTR/CFB/OFB 不需要）
const NEED_PADDING_MODES = new Set(['CBC', 'ECB']);
const PADDINGS = ['PKCS5Padding', 'PKCS7Padding'];

function parseCombined(combined) {
  if (!combined || typeof combined !== 'string') return {};
  const parts = combined.split('/');
  return {
    algorithm: parts[0] || '',
    model: parts[1] || '',
    padding: parts[2] || ''
  };
}

export default function CipherTool({ initialValue = {}, onSave, onCancel, onChange }) {
  const parsed = typeof initialValue.algorithm === 'string' && initialValue.algorithm.includes('/')
    ? parseCombined(initialValue.algorithm)
    : { algorithm: initialValue.algorithm || '', model: initialValue.model || '', padding: initialValue.padding || '' };

  const [algorithm, setAlgorithm] = useState(parsed.algorithm || ALGORITHMS[0]);
  const [model, setModel] = useState(parsed.model || (MODE_MAP[parsed.algorithm || ALGORITHMS[0]]?.[0] || ''));
  const [padding, setPadding] = useState(parsed.padding || PADDINGS[0]);

  // 用 ref 记录是否正在从外部 initialValue 同步（避免无限循环）
  const isSyncingRef = useRef(false);

  // 同步外部 initialValue 时设置 isSyncingRef 为 true
  useEffect(() => {
    const newParsed = typeof initialValue.algorithm === 'string' && initialValue.algorithm.includes('/')
      ? parseCombined(initialValue.algorithm)
      : { algorithm: initialValue.algorithm || '', model: initialValue.model || '', padding: initialValue.padding || '' };

    // 只有当新值和当前值不同时才更新
    if (newParsed.algorithm && newParsed.algorithm !== algorithm) {
      isSyncingRef.current = true;
      setAlgorithm(newParsed.algorithm);
    }
    if (newParsed.model && newParsed.model !== model) {
      isSyncingRef.current = true;
      setModel(newParsed.model);
    }
    if (newParsed.padding && newParsed.padding !== padding) {
      isSyncingRef.current = true;
      setPadding(newParsed.padding);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialValue]);

  // 实时回传（但只在不是从外部同步时才回传，以避免死循环）
  useEffect(() => {
    // 如果正在从外部同步，跳过本次回传
    if (isSyncingRef.current) {
      isSyncingRef.current = false;
      return;
    }

    const combined = [algorithm, model, padding].filter(Boolean).join('/');
    const merged = { algorithm, model, padding, combined };
    if (typeof onChange === 'function') onChange(merged);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [algorithm, model, padding]);

  // algorithm 改变时确保 model 可用
  useEffect(() => {
    const modes = MODE_MAP[algorithm] || [];
    if (modes.length > 0 && !modes.includes(model)) setModel(modes[0]);
    if (modes.length === 0) setModel('');
  }, [algorithm]);

  // 当 model 改变时，根据是否需要填充来设置或清除 padding
  useEffect(() => {
    if (!NEED_PADDING_MODES.has(model)) {
      // 不需要填充时清空
      setPadding('');
    } else {
      // 需要填充但当前为空时设置默认填充
      setPadding(prev => prev || PADDINGS[0]);
    }
  }, [model]);

  const modelRequiresPadding = NEED_PADDING_MODES.has(model);
  const isRSA = algorithm === 'RSA';
  const gridColsClass = !isRSA && modelRequiresPadding ? 'grid-cols-3' : 'grid-cols-2';

  return (
    <div className="space-y-3 w-full">
      {/* RSA: 仅显示算法选择 */}
      {isRSA ? (
        <div className="grid grid-cols-1 gap-4">
          <div>
            <Label>算法</Label>
            <Select value={algorithm} onValueChange={(v) => setAlgorithm(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALGORITHMS.map(a => (
                  <SelectItem key={a} value={a}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      ) : (
        // AES/SM4: 显示算法、模式、填充
        <>
          <div className={`grid ${gridColsClass} gap-4 items-end`}>
            <div>
              <Label>算法</Label>
              <Select value={algorithm} onValueChange={(v) => setAlgorithm(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALGORITHMS.map(a => (
                    <SelectItem key={a} value={a}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>模式</Label>
              { (MODE_MAP[algorithm] || []).length > 0 ? (
                <Select value={model} onValueChange={(v) => setModel(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(MODE_MAP[algorithm] || []).map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                // Don't render a Select with an empty-value item (Radix requires non-empty values).
                // Show a read-only placeholder instead.
                <div className="p-2 rounded border text-sm text-muted-foreground">(无)</div>
              )}
            </div>

            {modelRequiresPadding && (
              <div>
                <Label>填充</Label>
                <Select value={padding} onValueChange={(v) => setPadding(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PADDINGS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </>
      )}

    </div>
  );
}
