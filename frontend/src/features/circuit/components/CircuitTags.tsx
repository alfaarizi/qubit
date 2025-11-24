import { useState, useCallback, type KeyboardEvent } from 'react';
import { X, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useCircuitStore } from '@/features/circuit/store/CircuitStoreContext';

export function CircuitTags() {
    const tags = useCircuitStore((state) => state.tags);
    const addTag = useCircuitStore((state) => state.addTag);
    const removeTag = useCircuitStore((state) => state.removeTag);
    const isExecuting = useCircuitStore((state) => state.isExecuting);

    const [isAdding, setIsAdding] = useState(false);
    const [newTag, setNewTag] = useState('');

    const handleAddTag = useCallback(() => {
        const trimmed = newTag.trim();
        if (trimmed) {
            addTag(trimmed);
            setNewTag('');
        }
        setIsAdding(false);
    }, [newTag, addTag]);

    const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddTag();
        } else if (e.key === 'Escape') {
            setNewTag('');
            setIsAdding(false);
        }
    }, [handleAddTag]);

    return (
        <div className="flex items-center gap-2 px-4 py-2 flex-wrap min-h-[40px]">
            {tags.map((tag) => (
                <Badge
                    key={tag}
                    variant="secondary"
                    className="gap-1 pr-1 bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-100 border-amber-200 dark:border-amber-800"
                >
                    {tag}
                    <button
                        onClick={() => removeTag(tag)}
                        disabled={isExecuting}
                        className="ml-0.5 hover:bg-muted-foreground/20 rounded-full p-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label={`Remove tag ${tag}`}
                    >
                        <X className="h-3 w-3" />
                    </button>
                </Badge>
            ))}
            {isAdding ? (
                <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={handleAddTag}
                    placeholder="Add tag..."
                    className="h-6 w-32 text-xs"
                    autoFocus
                    disabled={isExecuting}
                />
            ) : (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsAdding(true)}
                    disabled={isExecuting}
                    className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                >
                    <Plus className="h-3 w-3 mr-1" />
                    Add tag
                </Button>
            )}
        </div>
    );
}
