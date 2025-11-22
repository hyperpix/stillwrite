
import React, { useMemo, useState } from 'react';
import { ScrollArea, Dialog, Button } from './ui/primitives';
import { SheetHeader, SheetTitle } from './ui/sheet';
import { NoteEntry } from '../types';
import { cn } from '../lib/utils';
import { Icons } from './Icons';

interface HistoryPanelProps {
    entries: NoteEntry[];
    onSelect: (entry: NoteEntry) => void;
    onDelete: (id: string) => void;
    currentEntryId: string | null;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({ entries, onSelect, onDelete, currentEntryId }) => {
    const [deleteId, setDeleteId] = useState<string | null>(null);
    
    // Sort entries by date descending
    const sortedEntries = useMemo(() => {
        return [...entries].sort((a, b) => b.createdAt - a.createdAt);
    }, [entries]);

    return (
        <div className="flex flex-col h-full">
            <SheetHeader className="px-6 py-6 border-b border-border/10">
                <div className="flex items-center justify-between">
                    <SheetTitle className="text-base font-medium">Entries</SheetTitle>
                    <div className="text-xs text-muted-foreground">{entries.length} notes</div>
                </div>
            </SheetHeader>
            
            <ScrollArea className="flex-1 h-full" data-lenis-prevent>
                <div className="flex flex-col">
                    {sortedEntries.length === 0 ? (
                         <div className="p-6 text-sm text-muted-foreground/50">No entries yet.</div>
                    ) : (
                        sortedEntries.map(entry => (
                            <div 
                                key={entry.id}
                                onClick={() => onSelect(entry)}
                                className={cn(
                                    "group flex flex-col gap-1 px-6 py-4 cursor-pointer transition-all duration-200 border-b border-border/5 hover:bg-accent/50",
                                    currentEntryId === entry.id ? "bg-accent" : ""
                                )}
                            >
                                <div className="flex items-center justify-between">
                                     <span className="text-sm font-semibold text-foreground">
                                        {new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(entry.createdAt))}
                                     </span>
                                     <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setDeleteId(entry.id);
                                        }}
                                        className="text-muted-foreground/40 hover:text-destructive transition-colors p-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100"
                                        title="Delete note"
                                     >
                                        <Icons.Trash className="w-4 h-4" />
                                     </button>
                                </div>
                                
                                <p className="text-sm text-muted-foreground line-clamp-1 font-normal leading-snug pr-4">
                                    {entry.snippet || "Empty entry"}
                                </p>
                            </div>
                        ))
                    )}
                </div>
            </ScrollArea>

            <Dialog 
                isOpen={!!deleteId} 
                onClose={() => setDeleteId(null)}
                title="Delete Note"
                description="Are you sure you want to delete this note? This action cannot be undone."
            >
                <div className="flex justify-end gap-2 mt-4">
                    <Button variant="ghost" onClick={() => setDeleteId(null)}>Cancel</Button>
                    <Button variant="destructive" onClick={() => {
                        if (deleteId) onDelete(deleteId);
                        setDeleteId(null);
                    }}>Delete</Button>
                </div>
            </Dialog>
        </div>
    );
};
