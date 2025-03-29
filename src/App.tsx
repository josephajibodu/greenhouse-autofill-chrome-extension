import { useState } from "react";

function App() {
  const [isLoading, setIsLoading] = useState(false);

  const handleAutofill = (): void => {
    setIsLoading(true);

    chrome.runtime.sendMessage({ action: "startAutofill" }, (response) => {
      setIsLoading(false);

      if (chrome.runtime.lastError) {
        console.error("Error sending message:", chrome.runtime.lastError);
      } else {
        console.log("Response from content script:", response);
      }
    });
  };

  return (
    <div className="w-[300px] h-[300px] flex flex-col items-center justify-center bg-amber-100">
      <button
        onClick={handleAutofill}
        disabled={isLoading}
        className={`flex items-center gap-1 text-sm bg-zinc-700 hover:bg-zinc-950 rounded-lg text-white cursor-pointer h-9 px-4 ${
          isLoading ? "opacity-50 cursor-not-allowed" : ""
        }`}
      >
        {isLoading ? (
          "Auto filling..."
        ) : (
          <>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="size-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
              />
            </svg>
            Autofill
          </>
        )}
      </button>
    </div>
  );
}

export default App;
