import {useEffect, useMemo, useState} from 'react'
import {Button} from '@/components/ui/button'
import {Check, Copy} from 'lucide-react'
import {useComposer} from '@/features/composer/ComposerStoreContext.tsx'
import {getOrCreateCircuitStore} from '@/features/circuit/store/CircuitStoreContext'
import {getQASMWithMetadata} from '@/lib/qasm/converter'
import {useTheme} from '@/providers/ThemeProvider.tsx'
import Editor, { type Monaco } from '@monaco-editor/react'

const QASM_KEYWORDS = [
    'OPENQASM', 'include', 'qreg', 'creg', 'gate', 'measure', 'barrier', 'reset', 'if', 'opaque', 'U', 'CX'
]

const QASM_GATES = [
    'h', 'x', 'y', 'z', 's', 't', 'sdg', 'tdg', 'sx', 'sxdg',
    'rx', 'ry', 'rz', 'cx', 'cy', 'cz', 'ch', 'swap', 'ccx', 'ccz',
    'u1', 'u2', 'u3', 'cu1', 'cu3', 'crx', 'cry', 'crz'
]

export function QasmEditor() {
    const [copied, setCopied] = useState(false)
    const [editorInstance, setEditorInstance] = useState<{ updateOptions: (options: { theme: string }) => void } | null>(null)
    const [, forceUpdate] = useState({})
    const { activeCircuitId } = useComposer()
    const { theme } = useTheme()

    const resolvedTheme = useMemo(() => {
        if (theme === 'system') {
            return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
        }
        return theme
    }, [theme])

    useEffect(() => {
        if (!activeCircuitId) return
        return getOrCreateCircuitStore(activeCircuitId).subscribe(() => forceUpdate({}))
    }, [activeCircuitId])

    useEffect(() => {
        if (editorInstance) {
            editorInstance.updateOptions({ theme: resolvedTheme === 'dark' ? 'qasm-dark' : 'qasm-light' })
        }
    }, [resolvedTheme, editorInstance])

    const circuitStore = activeCircuitId ? getOrCreateCircuitStore(activeCircuitId) : null

    const qasmData = useMemo(() => {
        const numQubits = circuitStore?.getState().numQubits ?? 3
        const placedGates = circuitStore?.getState().placedGates ?? []
        const measurements = circuitStore?.getState().measurements ?? []
        return getQASMWithMetadata(numQubits, placedGates, measurements)
    }, [circuitStore])

    const handleCopy = async () => {
        await navigator.clipboard.writeText(qasmData.code)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const registerQasmLanguage = (monaco: Monaco) => {
        monaco.languages.register({ id: 'qasm' })
        monaco.languages.setMonarchTokensProvider('qasm', {
            keywords: QASM_KEYWORDS,
            gates: QASM_GATES,
            tokenizer: {
                root: [
                    [/\/\/.*$/, 'comment'],
                    [/\b(OPENQASM|include|qreg|creg|gate|measure|barrier|reset|if|opaque)\b/, 'keyword'],
                    [/\b(h|x|y|z|s|t|sdg|tdg|sx|sxdg|rx|ry|rz|cx|cy|cz|ch|swap|ccx|ccz|u1|u2|u3|cu1|cu3|crx|cry|crz|U|CX)\b/, 'type'],
                    [/"([^"\\]|\\.)*"/, 'string'],
                    [/\b\d+\.?\d*([eE][-+]?\d+)?\b/, 'number'],
                    [/\bpi\b/, 'number'],
                    [/\b[a-z_][a-z0-9_]*\b/, 'identifier'],
                    [/[[\]]/, 'delimiter.bracket'],
                    [/[()]/, 'delimiter.parenthesis'],
                    [/[;,]/, 'delimiter'],
                    [/->/, 'operator'],
                ],
            },
        })

        monaco.editor.defineTheme('qasm-dark', {
            base: 'vs-dark',
            inherit: true,
            rules: [
                { token: 'keyword', foreground: 'C586C0', fontStyle: 'bold' },
                { token: 'type', foreground: '4EC9B0', fontStyle: 'bold' },
                { token: 'string', foreground: 'CE9178' },
                { token: 'number', foreground: 'B5CEA8' },
                { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
                { token: 'identifier', foreground: '9CDCFE' },
                { token: 'delimiter', foreground: 'D4D4D4' },
                { token: 'delimiter.bracket', foreground: 'FFD700' },
                { token: 'delimiter.parenthesis', foreground: 'DA70D6' },
                { token: 'operator', foreground: 'D4D4D4' },
            ],
            colors: {
                'editor.background': '#1e1e1e',
                'editor.foreground': '#d4d4d4',
                'editorLineNumber.foreground': '#858585',
                'editorLineNumber.activeForeground': '#c6c6c6',
                'editor.lineHighlightBackground': '#2a2a2a',
                'editorGutter.background': '#1e1e1e',
            },
        })

        monaco.editor.defineTheme('qasm-light', {
            base: 'vs',
            inherit: true,
            rules: [
                { token: 'keyword', foreground: '0000FF', fontStyle: 'bold' },
                { token: 'type', foreground: '267F99', fontStyle: 'bold' },
                { token: 'string', foreground: 'A31515' },
                { token: 'number', foreground: '098658' },
                { token: 'comment', foreground: '008000', fontStyle: 'italic' },
                { token: 'identifier', foreground: '001080' },
                { token: 'delimiter', foreground: '000000' },
                { token: 'delimiter.bracket', foreground: 'AF00DB' },
                { token: 'delimiter.parenthesis', foreground: '0431FA' },
                { token: 'operator', foreground: '000000' },
            ],
            colors: {
                'editor.background': '#ffffff',
                'editor.foreground': '#000000',
                'editorLineNumber.foreground': '#237893',
                'editorLineNumber.activeForeground': '#0B216F',
                'editor.lineHighlightBackground': '#f5f5f5',
                'editorGutter.background': '#f5f5f5',
            },
        })
    }

    return (
        <div className="flex flex-col flex-1 min-h-0 gap-3 p-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">QASM Code</h3>
                <Button variant="outline" size="sm" onClick={handleCopy}>
                    {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                    {copied ? 'Copied' : 'Copy'}
                </Button>
            </div>

            <div className="flex-1 min-h-0 border rounded-md overflow-hidden bg-[#1e1e1e] dark:bg-[#1e1e1e] [&_.monaco-editor_.view-lines]:!pl-2">
                <Editor
                    height="100%"
                    language="qasm"
                    value={qasmData.code}
                    theme={resolvedTheme === 'dark' ? 'qasm-dark' : 'qasm-light'}
                    options={{
                        readOnly: true,
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        fontSize: 13,
                        fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', monospace",
                        lineHeight: 20,
                        lineNumbers: 'on',
                        glyphMargin: false,
                        folding: false,
                        lineDecorationsWidth: 20,
                        lineNumbersMinChars: 3,
                        renderLineHighlight: 'all',
                        renderLineHighlightOnlyWhenFocus: false,
                        padding: { top: 12, bottom: 12 },
                        scrollbar: {
                            vertical: 'visible',
                            horizontal: 'visible',
                            useShadows: false,
                            verticalScrollbarSize: 12,
                            horizontalScrollbarSize: 12,
                        },
                        overviewRulerLanes: 0,
                        hideCursorInOverviewRuler: true,
                        overviewRulerBorder: false,
                        automaticLayout: true,
                        wordWrap: 'off',
                        wrappingIndent: 'none',
                    }}
                    onMount={(editor, monaco) => {
                        setEditorInstance(editor)
                        registerQasmLanguage(monaco)
                    }}
                />
            </div>
        </div>
    )
}