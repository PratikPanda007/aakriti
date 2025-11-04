import React, { useState, useMemo, useCallback, useEffect } from 'react';
import type { Theme, UploadedImage, GeneratedImage } from './types';
import { generateImage } from './services/geminiService';
import { THEMES } from './constants';
import { SignedIn, SignedOut, SignIn, UserButton, useUser } from '@clerk/clerk-react';

const LOCAL_STORAGE_KEY = 'aiPortraitGenerations';

const PREMIUM_USERS = [
  "pratic.panda@gmail.com",
  "pratikpanda0007@gmail.com",
];
const getInitialRecentGenerations = (): GeneratedImage[] => {
  // 💎 Special users who get 20 free generations instead of 10

  try {
    const storedGenerations = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (storedGenerations) {
      const parsed = JSON.parse(storedGenerations);
      if (Array.isArray(parsed)) {
        const validatedGenerations = parsed.filter(
          (item: any): item is GeneratedImage =>
            item &&
            typeof item === 'object' &&
            typeof item.id === 'string' &&
            typeof item.src === 'string' &&
            typeof item.prompt === 'string' &&
            typeof item.themeName === 'string' &&
            typeof item.timeTaken === 'number'
        );
        return validatedGenerations;
      }
    }
  } catch (e) {
    console.error("Failed to parse recent generations from localStorage", e);
  }
  return [];
};


const fileToDataUrl = (file: File): Promise<UploadedImage> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        return reject(new Error('FileReader did not return a string.'));
      }
      resolve({ data: reader.result, mimeType: file.type });
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

const Loader: React.FC = () => (
  <div className="absolute inset-0 bg-slate-800 bg-opacity-75 flex flex-col items-center justify-center z-50">
    <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-emerald-500"></div>
    <p className="text-white mt-4 text-lg">Generating your portrait...</p>
  </div>
);

interface ImageUploaderProps {
  count: number;
  uploadedImages: (UploadedImage | null)[];
  onImageChange: (index: number, file: File | null) => void;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ count, uploadedImages, onImageChange }) => {
  return (
    <div className={`grid gap-4 my-4 ${count === 1 ? 'grid-cols-1' : 'grid-cols-2 sm:grid-cols-3'}`}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-600 rounded-lg text-center">
          <label htmlFor={`file-upload-${index}`} className="cursor-pointer">
            {uploadedImages[index] ? (
              <img src={uploadedImages[index]?.data} alt={`Preview ${index + 1}`} className="w-32 h-32 object-cover rounded-md mb-2" />
            ) : (
              <div className="w-32 h-32 flex flex-col items-center justify-center bg-slate-700 rounded-md mb-2 text-slate-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="mt-2 text-sm">Upload Image {index + 1}</span>
              </div>
            )}
            <input
              id={`file-upload-${index}`}
              type="file"
              accept="image/png, image/jpeg, image/webp"
              className="hidden"
              onChange={(e) => onImageChange(index, e.target.files ? e.target.files[0] : null)}
            />
          </label>
        </div>
      ))}
    </div>
  );
};


const App: React.FC = () => {
    const { user } = useUser(); // Clerk hook to get current signed-in user
    const userEmail = user?.primaryEmailAddress?.emailAddress || "";
    const isPremiumUser = PREMIUM_USERS.includes(userEmail);
    const maxTokens = isPremiumUser ? 20 : 2;

    const userId = user?.id || "guest";
    const usageKey = `usageCount_${userId}`;

    const [usageCount, setUsageCount] = useState<number>(() => {
      const stored = localStorage.getItem(usageKey);

      // Handle missing, invalid, or non-numeric stored values safely
      if (!stored || stored === "undefined" || stored === "NaN") return 0;

      const parsed = parseInt(stored, 10);
      return isNaN(parsed) ? 0 : parsed;
    });

    const currentUsage = parseInt(localStorage.getItem(usageKey) || "0", 2);
    const tokensLeft = Math.max(maxTokens - currentUsage, 0);


  const [themes, setThemes] = useState<Theme[]>([]);
  const [themesLoading, setThemesLoading] = useState<boolean>(true);
  const [themesError, setThemesError] = useState<string | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<Theme | null>(null);
  const [uploadedImages, setUploadedImages] = useState<(UploadedImage | null)[]>([]);
  const [generatedImage, setGeneratedImage] = useState<GeneratedImage | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [recentGenerations, setRecentGenerations] = useState<GeneratedImage[]>(getInitialRecentGenerations);

  useEffect(() => {
    const fetchThemes = async () => {
      try {
        setThemesLoading(true);
        setThemesError(null);
        const response = await fetch('https://cloudwave.azurewebsites.net/API/GetAakritiPrompts');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          setThemes(data);
        } else {
          throw new Error('Invalid or empty data format received from API.');
        }
      } catch (error) {
        console.error("Failed to fetch themes. This could be a CORS issue or the API might be down. Falling back to local data.", error);
        setThemesError("Could not load latest themes. Using a default set.");
        setThemes(THEMES);
      } finally {
        setThemesLoading(false);
      }
    };
    fetchThemes();
  }, []);

  const groupedThemes = useMemo(() => {
    return themes.reduce((acc: Record<string, Theme[]>, theme) => {
      (acc[theme.category] = acc[theme.category] || []).push(theme);
      return acc;
    }, {} as Record<string, Theme[]>);
  }, [themes]);

  useEffect(() => {
    if (!generatedImage) return;

    setRecentGenerations((currentRecents) => {
      const recents = Array.isArray(currentRecents) ? currentRecents : [];
      const updatedRecents = [generatedImage, ...recents].slice(0, 3);
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedRecents));
      } catch (e) {
        if (e instanceof DOMException && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
          console.warn("LocalStorage quota exceeded. Could not save recent generations.");
        } else {
          console.error("Failed to save to localStorage:", e);
        }
      }
      return updatedRecents;
    });
  }, [generatedImage]);

  const handleThemeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const themeId = parseInt(e.target.value, 10);
    const theme = themes.find(t => t.id === themeId) || null;
    setSelectedTheme(theme);
    setUploadedImages(theme ? Array(theme.imgsNeeded).fill(null) : []);
    setGeneratedImage(null);
    setError(null);
  };

  const handleImageChange = async (index: number, file: File | null) => {
    if (!file) {
      const newImages = [...uploadedImages];
      newImages[index] = null;
      setUploadedImages(newImages);
      return;
    }

    try {
      const imageData = await fileToDataUrl(file);
      const newImages = [...uploadedImages];
      newImages[index] = imageData;
      setUploadedImages(newImages);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("There was an error processing the image file.");
    }
  };

  // const handleGenerateClick = useCallback(async () => {
  //   if (!selectedTheme) {
  //     setError("Please select a theme first.");
  //     return;
  //   }

  //   const allImagesUploaded = uploadedImages.every(img => img !== null);
  //   if (!allImagesUploaded) {
  //     setError(`Please upload all ${selectedTheme.imgsNeeded} required image(s).`);
  //     return;
  //   }

  //   setIsLoading(true);
  //   setError(null);
  //   setGeneratedImage(null);
  //   const startTime = Date.now();

  //   try {
  //     const validImages = uploadedImages.filter((img): img is UploadedImage => img !== null);
  //     const resultSrc = await generateImage(selectedTheme.prompt, validImages);
      
  //     const endTime = Date.now();
  //     const newGeneration: GeneratedImage = {
  //       id: `gen-${Date.now()}`,
  //       src: resultSrc,
  //       prompt: selectedTheme.prompt,
  //       themeName: selectedTheme.name,
  //       timeTaken: (endTime - startTime) / 1000,
  //     };

  //     setGeneratedImage(newGeneration);
      
  //   } catch (err) {
  //     if (err instanceof Error) {
  //       setError(err.message);
  //     } else {
  //       setError("An unknown error occurred during image generation.");
  //     }
  //   } finally {
  //     setIsLoading(false);
  //   }
  // }, [selectedTheme, uploadedImages]);

  const handleGenerateClick = useCallback(async () => {
  if (!selectedTheme) {
    setError("Please select a theme first.");
    return;
  }

  const allImagesUploaded = uploadedImages.every(img => img !== null);
  if (!allImagesUploaded) {
    setError(`Please upload all ${selectedTheme.imgsNeeded} required image(s).`);
    return;
  }

  // 🪙 Free Tier Limit Check (safe & accurate)
  const userId = user?.id || "guest";
  const usageKey = `usageCount_${userId}`;
  const storedValue = localStorage.getItem(usageKey);
  const currentUsage = parseInt(storedValue || "0", 10);

  // Fix invalid values like "undefined" or NaN
  const safeUsage = isNaN(currentUsage) ? 0 : currentUsage;

  // ✅ Check limit BEFORE generation
  if (safeUsage >= maxTokens) {
    setError(`You’ve reached your free limit of ${maxTokens} image generations. Please upgrade to continue.`);
    return;
  }

  setIsLoading(true);
  setError(null);
  setGeneratedImage(null);
  const startTime = Date.now();

  try {
    const validImages = uploadedImages.filter((img): img is UploadedImage => img !== null);
    const resultSrc = await generateImage(selectedTheme.prompt, validImages);

    const endTime = Date.now();
    const newGeneration: GeneratedImage = {
      id: `gen-${Date.now()}`,
      src: resultSrc,
      prompt: selectedTheme.prompt,
      themeName: selectedTheme.name,
      timeTaken: (endTime - startTime) / 1000,
    };

    setGeneratedImage(newGeneration);

    // ✅ Increment usage count & update header instantly
    const newCount = safeUsage + 1;
    localStorage.setItem(usageKey, String(newCount));
    setUsageCount(newCount);
  } catch (err) {
    if (err instanceof Error) {
      setError(err.message);
    } else {
      setError("An unknown error occurred during image generation.");
    }
  } finally {
    setIsLoading(false);
  }
}, [selectedTheme, uploadedImages, user, usageCount]);


  const areAllImagesUploaded = selectedTheme && uploadedImages.every(img => img !== null) && uploadedImages.length > 0;

  return (
    <>
      {/* If the user is not signed in, show Clerk Sign-In */}
      <SignedOut>
        <div className="flex justify-center items-center h-screen bg-slate-900 text-white">
          <SignIn routing="path" path="/sign-in" />
        </div>
      </SignedOut>

      {/* If the user is signed in, show your full existing UI */}
      <SignedIn>
        {/* Optional: add a small header above your main UI */}
        <header className="w-full flex items-center justify-between bg-slate-800/60 backdrop-blur-md border border-slate-700 rounded-2xl px-6 py-4 mb-8 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4">
            <h1 className="text-2xl md:text-3xl font-bold text-emerald-400 tracking-tight">
              Welcome, <span className="text-white">{user?.firstName || "Creator"} 👋</span>
            </h1>
            <p className="text-sm text-slate-400 mt-1 sm:mt-0">
              Tokens left: <span className="text-emerald-400 font-semibold">
                {isNaN(tokensLeft) ? 0 : tokensLeft}
              </span>/{maxTokens}
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <UserButton
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  userButtonAvatarBox: "ring-2 ring-emerald-500 hover:ring-emerald-400 transition-all duration-200",
                },
              }}
            />
          </div>
        </header>


    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4 font-sans">
      <main className="w-full max-w-2xl mx-auto bg-slate-800 rounded-2xl shadow-2xl p-6 md:p-8 relative overflow-hidden">
        {isLoading && <Loader />}
        
        <div className="text-center mb-6">
          <h1 className="text-3xl md:text-4xl font-bold text-emerald-400">AI Portrait Theme Generator</h1>
          <p className="text-slate-400 mt-2">Transform your photos with creative AI-powered themes.</p>
        </div>

        <div className="space-y-6">
          <div>
            <label htmlFor="theme-select" className="block text-sm font-medium text-slate-300 mb-2">1. Choose a Theme</label>
            {themesLoading && <div className="w-full bg-slate-700 p-3 rounded-lg text-slate-400">Loading themes...</div>}
            
            {themesError && (
                <div className="bg-amber-800 border border-amber-600 text-amber-100 px-4 py-2 rounded-lg text-sm mb-4" role="alert">
                    <strong>Notice:</strong> {themesError}
                </div>
            )}

            {!themesLoading && themes.length > 0 && (
              <select
                id="theme-select"
                onChange={handleThemeChange}
                className="w-full bg-slate-700 text-white p-3 rounded-lg border-2 border-slate-600 focus:border-emerald-500 focus:ring-emerald-500 transition"
                defaultValue=""
              >
                <option value="" disabled>Select a style...</option>
                {Object.entries(groupedThemes).map(([category, themeItems]) => (
                  <optgroup key={category} label={category}>
                    {themeItems.map(theme => (
                      <option key={theme.id} value={theme.id}>{theme.name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            )}

            {!themesLoading && themes.length === 0 && (
                <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded-lg">
                    <strong>Error:</strong> Failed to load any themes. Please try refreshing the page.
                </div>
            )}
          </div>

          {selectedTheme && (
            <div>
              <p className="block text-sm font-medium text-slate-300 mb-2">2. Upload {selectedTheme.imgsNeeded} Image(s)</p>
              <ImageUploader 
                key={selectedTheme.id}
                count={selectedTheme.imgsNeeded} 
                uploadedImages={uploadedImages} 
                onImageChange={handleImageChange} 
              />
            </div>
          )}

          {areAllImagesUploaded && (
            <button
              onClick={handleGenerateClick}
              disabled={isLoading}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-4 rounded-lg transition-transform transform hover:scale-105 disabled:bg-slate-600 disabled:cursor-not-allowed"
            >
              Generate Image
            </button>
          )}

          {error && (
            <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded-lg" role="alert">
              <strong className="font-bold">Error: </strong>
              <span className="block sm:inline">{error}</span>
            </div>
          )}

          {generatedImage && (
            <div className="animate-fade-in">
              <h3 className="text-xl font-semibold mb-2 text-center">Your Generated Portrait!</h3>
              <img src={generatedImage.src} alt="Generated portrait" className="w-full rounded-lg shadow-lg" />
              <div className="text-center mt-4">
                 <p className="text-sm text-slate-400">
                  Image generated successfully. Time taken: {generatedImage.timeTaken.toFixed(2)}s
                </p>
                <a
                  href={generatedImage.src}
                  download={`ai-portrait-${generatedImage.themeName.toLowerCase().replace(/\s/g, '-')}.png`}
                  className="mt-2 inline-block bg-slate-600 hover:bg-slate-700 text-white font-bold py-2 px-6 rounded-lg transition"
                >
                  Download Image
                </a>
              </div>
            </div>
          )}
        </div>
      </main>

{/* FIX: Changed from a logical AND (&&) to a ternary operator to help TypeScript's type narrowing. */}
       {Array.isArray(recentGenerations) && recentGenerations.length > 0 ? (
        <section className="w-full max-w-2xl mx-auto mt-8">
            <h2 className="text-xl font-semibold text-slate-300 mb-4 text-center">Recent Generations</h2>
            <div className="grid grid-cols-3 gap-4">
                {recentGenerations.map((gen) => (
                    <div key={gen.id} className="group relative">
                        <img src={gen.src} alt={gen.themeName} className="w-full h-full object-cover rounded-lg aspect-square" />
                         <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-all flex items-center justify-center">
                              <a href={gen.src} download={`ai-portrait-${gen.themeName.toLowerCase().replace(/\s/g, '-')}.png`} className="opacity-0 group-hover:opacity-100 transition-opacity bg-emerald-500 p-2 rounded-full">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                            </a>
                        </div>
                    </div>
                ))}
            </div>
        </section>
      ) : null}

      <footer className="text-center text-slate-500 mt-8">
      </footer>
    </div>
    </SignedIn>
    </>
  );
};

export default App;