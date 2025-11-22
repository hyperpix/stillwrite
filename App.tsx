
import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { Popover, Button, Slider, Label } from './components/ui/primitives';
import { Sheet, SheetContent } from './components/ui/sheet';
import { Icons } from './components/Icons';
import { HistoryPanel } from './components/HistoryPanel';
import { AuthDialog } from './components/AuthDialog';
import { AppSettings, NoteEntry, FontType, User } from './types';
import { cn, generateId } from './lib/utils';
import { auth } from './lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { getEntries, saveEntry, deleteEntry, getSettings, saveSettings } from './services/storage';

function App() {
  // State
  const [user, setUser] = useState<User | null>(null);
  
  const [settings, setSettings] = useState<AppSettings>({
    fontSize: 22,
    fontFamily: 'lato',
    theme: 'dark', 
    isZenMode: false,
  });

  const [entries, setEntries] = useState<NoteEntry[]>([]);
  const [content, setContent] = useState('');
  const [currentEntryId, setCurrentEntryId] = useState<string | null>(null);
  
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Timer State
  const [timerSeconds, setTimerSeconds] = useState(900); // 15 minutes
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // Refs
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const initialLoadRef = useRef(false);

  // -- Auth & Data Loading Effects --

  useEffect(() => {
    const unsubscribe = auth ? onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
             const appUser: User = {
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                displayName: firebaseUser.displayName,
                photoURL: firebaseUser.photoURL
            };
            setUser(appUser);
            
            // Load Data from Firestore
            const [loadedEntries, loadedSettings] = await Promise.all([
                getEntries(appUser.uid),
                getSettings(appUser.uid)
            ]);
            setEntries(loadedEntries);
            setSettings(loadedSettings);

            // If there's a current "welcome" note or empty state, maybe load the latest entry
            // For now, we just clear if it was the default welcome note
            if (content.includes("Hi. My name is Farza") && loadedEntries.length > 0) {
                // Optionally clear welcome note logic
            }

        } else {
            setUser(null);
            // Load Data from LocalStorage (Guest)
            const [loadedEntries, loadedSettings] = await Promise.all([
                getEntries(null),
                getSettings(null)
            ]);
            setEntries(loadedEntries);
            setSettings(loadedSettings);
        }
        setIsInitialized(true);
    }) : () => {
        // Fallback if auth isn't initialized (e.g. missing keys)
        (async () => {
             const [loadedEntries, loadedSettings] = await Promise.all([
                getEntries(null),
                getSettings(null)
            ]);
            setEntries(loadedEntries);
            setSettings(loadedSettings);
            setIsInitialized(true);
        })();
    };

    return () => {
        if (typeof unsubscribe === 'function') unsubscribe();
    }
  }, []);

  // Handle content loading on first init or entry switch
  useEffect(() => {
    if (isInitialized && !initialLoadRef.current) {
        initialLoadRef.current = true;
        
        // Determine initial content
        if (entries.length > 0 && entries[0].id === 'welcome') {
             setContent(entries[0].content);
             setCurrentEntryId('welcome');
        } else if (entries.length === 0) {
             // Start fresh
             setContent('');
             setCurrentEntryId(null);
        } else {
             // User has entries, but we start fresh
             setContent('');
             setCurrentEntryId(null);
        }
    }
  }, [isInitialized, entries]);

  // Theme application
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(settings.theme);
  }, [settings.theme]);

  // Timer logic
  useEffect(() => {
    let interval: any;
    if (isTimerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds(prev => {
            if (prev <= 1) {
                setIsTimerRunning(false);
                return 0;
            }
            return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerSeconds]);

  // Save Settings Persistence
  const handleSettingChange = (newSettings: AppSettings) => {
      setSettings(newSettings);
      saveSettings(user?.uid || null, newSettings);
  };

  // Auto-save current work
  useEffect(() => {
    if (!isInitialized) return;

    if (!currentEntryId && content.length > 0) {
      // Create new entry ID if typing starts
      const newId = generateId();
      setCurrentEntryId(newId);
    }

    if (currentEntryId) {
      setSaveStatus('saving');
      const timeoutId = setTimeout(async () => {
            const snippet = content.slice(0, 30).replace(/\n/g, ' ') + (content.length > 30 ? '...' : '');
            const now = Date.now();
            const entryToSave: NoteEntry = {
                id: currentEntryId,
                content,
                createdAt: entries.find(e => e.id === currentEntryId)?.createdAt || now,
                snippet,
                updatedAt: now
            };

            // Optimistic UI Update
            setEntries(prev => {
                const existingIndex = prev.findIndex(e => e.id === currentEntryId);
                if (existingIndex >= 0) {
                    const newEntries = [...prev];
                    newEntries[existingIndex] = entryToSave;
                    return newEntries;
                } else {
                    return [entryToSave, ...prev];
                }
            });

            // Persist
            await saveEntry(user?.uid || null, entryToSave);
            setSaveStatus('saved');
      }, 1000); // Debounce save 1s
      return () => clearTimeout(timeoutId);
    }
  }, [content, currentEntryId, isInitialized]);

  // Auto-resize Textarea
  useLayoutEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${scrollHeight}px`;
    }
  }, [content, settings.fontSize, settings.fontFamily]);


  // -- Handlers --

  const toggleTheme = () => {
    const newTheme = settings.theme === 'dark' ? 'light' : 'dark';
    handleSettingChange({ ...settings, theme: newTheme });
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  const handleNewEntry = () => {
    setContent('');
    setCurrentEntryId(null);
    setTimerSeconds(900);
    setIsTimerRunning(false);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const handleLoadEntry = (entry: NoteEntry) => {
    setContent(entry.content);
    setCurrentEntryId(entry.id);
    setIsHistoryOpen(false);
    setTimerSeconds(900);
    setIsTimerRunning(false);
  };

  const handleDeleteEntry = async (id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id));
    await deleteEntry(user?.uid || null, id);
    
    if (currentEntryId === id) {
      handleNewEntry();
    }
  };

  const handleLogin = (user: User) => {
      setUser(user);
      // Effect will handle data reload
  };
  
  const handleLogout = () => {
      if (auth) signOut(auth);
      // Effect will handle state cleanup
  };

  const handleFontChange = (font: FontType) => {
      handleSettingChange({ ...settings, fontFamily: font });
  };

  const handleRandomFont = () => {
     const fonts: FontType[] = ['sans', 'lato', 'serif', 'mono'];
     const random = fonts[Math.floor(Math.random() * fonts.length)];
     handleFontChange(random);
  };

  const handleFontSizeChange = (val: number) => {
      handleSettingChange({ ...settings, fontSize: val });
  }

  // -- Computed Styles --
  
  const getFontFamily = () => {
      switch (settings.fontFamily) {
          case 'mono': return 'font-mono';
          case 'serif': return 'font-serif';
          case 'lato': return 'font-lato';
          case 'sans': default: return 'font-sans';
      }
  };

  const formatTime = (secs: number) => {
      const m = Math.floor(secs / 60);
      const s = secs % 60;
      return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!isInitialized) {
      return <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
          <Icons.Loader className="w-6 h-6 animate-spin" />
      </div>;
  }

  return (
    <div 
        className={cn(
            "min-h-screen w-full flex flex-col bg-background text-foreground transition-colors duration-500 ease-in-out font-sans",
        )}
        onClick={(e) => {
            if (textareaRef.current && e.target === e.currentTarget) {
                textareaRef.current.focus();
            }
        }}
    >
      
      {/* Main Editor Area */}
      <main className="flex-1 relative flex justify-center w-full max-w-4xl mx-auto px-4 sm:px-12 pt-24 pb-32 min-h-screen">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => {
              setContent(e.target.value);
              if (!isTimerRunning && timerSeconds === 900) {
                  setIsTimerRunning(true);
              }
          }}
          placeholder="Type your first thought"
          spellCheck={false}
          className={cn(
            "w-full bg-transparent resize-none focus:outline-none border-none ring-0 text-left placeholder:text-muted-foreground/30 selection:bg-primary/20 transition-colors duration-300 ease-out overflow-hidden",
            getFontFamily()
          )}
          style={{ 
              fontSize: `${settings.fontSize}px`,
              lineHeight: 1.6,
              height: 'auto', 
              display: 'block'
          }}
        />
      </main>

      {/* Footer Status Bar */}
      <footer className={cn(
          "fixed bottom-0 left-0 w-full z-40 transition-opacity duration-500 ease-in-out",
          (settings.isZenMode && content.length > 0 && timerSeconds > 0) ? "opacity-10 hover:opacity-100" : "opacity-100"
      )}>
        {/* Background with mask */}
        <div className="absolute inset-0 bg-background/90 backdrop-blur-sm transition-colors duration-500 ease-in-out border-t border-border/50" />

        {/* Content */}
        <div className="relative w-full p-3 sm:p-4 flex items-center justify-between text-xs sm:text-sm text-muted-foreground/60 select-none">
          {/* Left: Typography Controls */}
          <div className="flex items-center gap-2 sm:gap-4">
               <Popover 
                  trigger={<span className="hover:text-foreground cursor-pointer transition-colors opacity-70 hover:opacity-100 px-2 py-1 border border-transparent hover:border-border rounded-md">{settings.fontSize}px</span>}
                  content={
                      <div className="p-4 w-64">
                          <div className="flex items-center justify-between mb-4">
                            <Label className="text-xs font-medium text-muted-foreground">Size</Label>
                            <span className="text-xs font-bold text-foreground">{settings.fontSize}px</span>
                          </div>
                          <Slider 
                             min={14} 
                             max={48} 
                             step={1} 
                             value={settings.fontSize}
                             onChange={(e) => handleFontSizeChange(parseInt(e.target.value))}
                             className="mb-2"
                          />
                          <div className="flex justify-between items-center text-muted-foreground px-1">
                              <span className="text-[10px] uppercase tracking-wider">Small</span>
                              <span className="text-[10px] uppercase tracking-wider">Large</span>
                          </div>
                      </div>
                  }
               />

               <div className="hidden md:flex items-center gap-3">
                   <span className="inline text-muted-foreground/30">•</span>
                   <button onClick={() => handleFontChange('lato')} className={cn("hover:text-foreground transition-colors", settings.fontFamily === 'lato' && "text-foreground font-bold")}>Lato</button>
                   <span className="inline text-muted-foreground/30">•</span>
                   <button onClick={() => handleFontChange('sans')} className={cn("hover:text-foreground transition-colors", settings.fontFamily === 'sans' && "text-foreground font-bold")}>System</button>
                   <span className="inline text-muted-foreground/30">•</span>
                   <button onClick={() => handleFontChange('serif')} className={cn("hover:text-foreground transition-colors", settings.fontFamily === 'serif' && "text-foreground font-bold")}>Serif</button>
                   <span className="inline text-muted-foreground/30">•</span>
                   <button onClick={handleRandomFont} className="hover:text-foreground transition-colors flex items-center gap-1">
                       Random
                       <span className="text-[10px] opacity-50">[{settings.fontFamily === 'mono' ? 'Courier New' : settings.fontFamily.charAt(0).toUpperCase() + settings.fontFamily.slice(1)}]</span>
                   </button>
               </div>
          </div>

          {/* Right: App Controls */}
          <div className="flex items-center gap-3 sm:gap-4 md:gap-6">
              
              <button 
                  onClick={() => {
                      setTimerSeconds(900);
                      setIsTimerRunning(false);
                  }}
                  className={cn(
                      "hover:text-foreground transition-colors variant-numeric-tabular px-1", 
                      timerSeconds === 0 && "text-foreground font-bold animate-pulse"
                  )}
                  title="Click to reset timer"
              >
                  {formatTime(timerSeconds)}
              </button>

              <span className="hidden sm:inline text-muted-foreground/30">•</span>

              {/* Save Status / Auth Trigger */}
              {user ? (
                  <Popover 
                      trigger={
                          <button className={cn(
                              "hidden sm:inline-block transition-colors", 
                              saveStatus === 'saving' ? "text-muted-foreground" : "hover:text-foreground cursor-pointer"
                          )}>
                              {saveStatus === 'saving' ? "Saving..." : user.email}
                          </button>
                      }
                      content={
                          <div className="flex flex-col p-1.5 w-40">
                              <div className="px-2 py-1.5 text-xs text-muted-foreground border-b mb-1 truncate">
                                  {user.email}
                              </div>
                              <button 
                                  onClick={handleLogout}
                                  className="w-full text-left px-2 py-1.5 text-xs rounded-md transition-colors text-destructive hover:bg-destructive/10"
                              >
                                  Sign Out
                              </button>
                          </div>
                      }
                  />
              ) : (
                  <button 
                    onClick={() => setIsAuthOpen(true)} 
                    className="hidden sm:inline-block transition-colors hover:text-foreground"
                  >
                      Login / Sync
                  </button>
              )}

              <span className="hidden sm:inline text-muted-foreground/30">•</span>

              <button onClick={toggleFullscreen} className="hover:text-foreground transition-colors hidden sm:inline-block">
                  Fullscreen
              </button>

              <span className="hidden sm:inline text-muted-foreground/30">•</span>
              
              <button onClick={toggleTheme} className="hover:text-foreground transition-colors p-1" aria-label="Toggle Theme">
                  <span className="hidden sm:inline">{settings.theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
                  <span className="sm:hidden flex items-center">
                       {settings.theme === 'dark' ? <Icons.Sun className="w-4 h-4" /> : <Icons.Moon className="w-4 h-4" />}
                  </span>
              </button>

              <span className="text-muted-foreground/30">•</span>

              <button onClick={handleNewEntry} className="hover:text-foreground transition-colors p-1" aria-label="New Entry">
                  <span className="hidden sm:inline">New Entry</span>
                  <span className="sm:hidden flex items-center"><Icons.Plus className="w-4 h-4" /></span>
              </button>

              <span className="text-muted-foreground/30">•</span>

              <button onClick={() => setIsHistoryOpen(true)} className="hover:text-foreground transition-colors p-1" aria-label="View Entries">
                  <Icons.History className="w-4 h-4" />
              </button>
              
          </div>
        </div>
      </footer>

      <Sheet open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <SheetContent className="p-0 w-80 sm:w-80 bg-background" side="right">
            <HistoryPanel 
                entries={entries} 
                onSelect={handleLoadEntry} 
                onDelete={handleDeleteEntry} 
                currentEntryId={currentEntryId}
            />
        </SheetContent>
      </Sheet>

      <AuthDialog 
        isOpen={isAuthOpen} 
        onClose={() => setIsAuthOpen(false)} 
        onLogin={handleLogin} 
      />

    </div>
  );
}

export default App;
