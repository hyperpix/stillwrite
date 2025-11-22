
import { doc, setDoc, getDoc, collection, getDocs, deleteDoc, Timestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { NoteEntry, AppSettings } from "../types";
import { generateId } from "../lib/utils";

const DEFAULT_SETTINGS: AppSettings = {
  fontSize: 22,
  fontFamily: 'lato',
  theme: 'dark', 
  isZenMode: false,
};

const WELCOME_NOTE = `Hi. My name is Farza.

I made this app.

Plz read this guide. I beg of you.

It's 5 min max.

This is not a journaling app or a note-taking app.
If you use it for that, you'll probably use it once or twice,
and then never touch it again.

This is a tool purely to help you freewrite.

Freewriting is a writing strategy developed in 1973 — it's where you write continuously for a set time without worrying about grammar, spelling, or anything like that. A pure stream of consciousness.

I picked up freewriting many years ago.

It's led to real breakthroughs — like helping me untangle big feelings around shutting down my last company, reflecting on my relationships, and figuring out what actually matters to me as I continuously figure out the next chapter of life.

Using this app is actually super simple:

1. Think of a topic to write about (ex. a breakup, a struggle at work, a new idea)
2. Click fullscreen
3. Click the timer
4. Start writing. No backspaces allowed. Don't stop writing.

Once the timer is done, it'll fade back in — and you'll know to stop.

That's it.

Some basic rules:

- Again, no backspaces
- No fixing spelling
- Little 5–10s breaks are fine, but try to not stop typing
- No need to stay on the topic ou started with — let your mind wander
- No judgment — trust your mind!

It's like your brain is GPT and you just exhaust all the tokens in your head around a particular topic — and by the end, you'll likely feel clearer about whatever it was you were writing about.

I know 15m can sound scary for some. What do you even write about.

If you're new to writing, try this:

Before you start your working day, open this app and do a 15m session answering this simple question: "What am I working on today? Why is that the most important thing for me to work on?"

And don't stop writing for 15 minutes.

This little session is how I planned and prioritized my days for many years.

Do this for 3-days straight.

I find this is an easy way to get into writing.

You'd be surprised how easy it is to get sucked into nonsense right when the day starts — and then end up getting nothing of real value done over the next 8–12 hours.

Often after this planning session, I'm 100x more clear and excited about what I'm about to do — and I usually end up changing what I originally planned, for the better.

If you don't wanna write about work, other starting prompts I use for myself:

- "Today, X happened. And it's got me feeling really down. I think — "
- "I had a new idea around Z today and want to think through it. Basically — "
- "I'm in love. And I just wanna talk about it. So — "
- "I think I wanna pivot some stuff. Here's how I'm thinking about it — "

The starting prompt is everything. So, think on it.

Some people are better at writing about emotions.
Some are better at writing about work or ideas.

Try everything. See what works for you.

Freewriting is the most important skill I picked up in the last 10 years.

It's helped me think through my most difficult life decisions.
It's helped me think through startups in a more thorough way.
It's made me a better partner and friend (I like communicating with letters).
It's helped me be happier (on my down days, I write it all out and feel better).

So that's it! That's the app. I hope freewriting helps you.
-
1)

I know it's a dumb little app — just a text view with some black text + a timer — but, use its ideas properly and it can make a big impact :).

(Or it ends up being dumb and useless for you haha. Find out for yourself!)`;

// Local Storage Keys
const LS_SETTINGS = 'flow-settings';
const LS_ENTRIES = 'flow-entries';

// --- Helpers ---

export const saveSettings = async (userId: string | null, settings: AppSettings) => {
    if (userId && db) {
        // Save to Cloud
        try {
            await setDoc(doc(db, "users", userId, "config", "settings"), settings);
        } catch (e) {
            console.error("Error saving settings to cloud", e);
        }
    }
    // Always save to local for offline/fast load
    localStorage.setItem(LS_SETTINGS, JSON.stringify(settings));
};

export const getSettings = async (userId: string | null): Promise<AppSettings> => {
    let settings = DEFAULT_SETTINGS;
    
    // Try local first for speed
    const localSaved = localStorage.getItem(LS_SETTINGS);
    if (localSaved) {
        try {
            settings = JSON.parse(localSaved);
        } catch(e) {}
    }

    if (userId && db) {
        try {
            const docSnap = await getDoc(doc(db, "users", userId, "config", "settings"));
            if (docSnap.exists()) {
                const cloudSettings = docSnap.data() as AppSettings;
                // Merge? Or just overwrite? Let's overwrite local with cloud source of truth
                settings = cloudSettings;
                localStorage.setItem(LS_SETTINGS, JSON.stringify(settings));
            }
        } catch (e) {
            console.error("Error loading settings from cloud", e);
        }
    }
    return settings;
};

export const saveEntry = async (userId: string | null, entry: NoteEntry) => {
    if (userId && db) {
        try {
            await setDoc(doc(db, "users", userId, "entries", entry.id), {
                ...entry,
                updatedAt: Date.now()
            });
        } catch (e) {
             console.error("Error saving entry to cloud", e);
        }
    } else {
        // Guest Mode: Save to Local Storage
        const currentEntries = await getEntries(null);
        const index = currentEntries.findIndex(e => e.id === entry.id);
        if (index >= 0) {
            currentEntries[index] = entry;
        } else {
            currentEntries.unshift(entry);
        }
        localStorage.setItem(LS_ENTRIES, JSON.stringify(currentEntries));
    }
};

export const deleteEntry = async (userId: string | null, entryId: string) => {
    if (userId && db) {
        try {
            await deleteDoc(doc(db, "users", userId, "entries", entryId));
        } catch (e) {
            console.error("Error deleting entry from cloud", e);
        }
    } else {
        const currentEntries = await getEntries(null);
        const newEntries = currentEntries.filter(e => e.id !== entryId);
        localStorage.setItem(LS_ENTRIES, JSON.stringify(newEntries));
    }
};

export const getEntries = async (userId: string | null): Promise<NoteEntry[]> => {
    if (userId && db) {
        try {
            const querySnapshot = await getDocs(collection(db, "users", userId, "entries"));
            const entries: NoteEntry[] = [];
            querySnapshot.forEach((doc) => {
                entries.push(doc.data() as NoteEntry);
            });
            // Sort by date desc
            return entries.sort((a, b) => b.createdAt - a.createdAt);
        } catch (e) {
            console.error("Error fetching entries from cloud", e);
            return [];
        }
    } else {
        // Guest Mode
        const saved = localStorage.getItem(LS_ENTRIES);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) return parsed;
            } catch (e) {}
        }
        // Default Welcome Note for guests
        return [{
            id: 'welcome',
            content: WELCOME_NOTE,
            createdAt: Date.now(),
            snippet: "Hi. My name is Farza. I made this app."
        }];
    }
};
