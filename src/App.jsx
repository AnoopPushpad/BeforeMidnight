import { useEffect, useState } from "react";
import "./App.css";

const getTodayString = () => new Date().toDateString();
const getYesterdayString = () => new Date(Date.now() - 86400000).toDateString();

function App() {
  const [timeLeft, setTimeLeft] = useState("");
  const [text, setText] = useState("");
  const [isMobile, setIsMobile] = useState(
    () =>
      typeof navigator !== "undefined" &&
      /Android|webOS|iPhone|iPad|iPod|Opera Mini|IEMobile|Mobile|Tablet/i.test(
        navigator.userAgent,
      ),
  );

  const createYesterdaySummary = (taskList, date) => {
    const completed = taskList.filter((t) => t.completed).length;
    const remaining = taskList.filter((t) => !t.completed).length;

    return {
      date: date || getYesterdayString(),
      completed,
      remaining,
      unfinishedTasks: taskList.filter((t) => !t.completed),
    };
  };

  const [preloaded] = useState(() => {
    const savedTasks = localStorage.getItem("tasks");
    const savedDate = localStorage.getItem("lastDate");
    const savedYesterday = localStorage.getItem("yesterdaySummary");
    const today = getTodayString();
    const yesterdayString = getYesterdayString();

    const oldTasks = savedTasks ? JSON.parse(savedTasks) : [];
    const initialYesterday = savedYesterday ? JSON.parse(savedYesterday) : null;

    if (savedDate !== today) {
      const summary = createYesterdaySummary(
        oldTasks,
        savedDate || yesterdayString,
      );

      localStorage.removeItem("tasks");
      localStorage.setItem("lastDate", today);

      if (summary.completed === 0 && summary.remaining === 0) {
        localStorage.removeItem("yesterdaySummary");
        return { initialTasks: [], initialYesterday: null };
      }

      localStorage.setItem("yesterdaySummary", JSON.stringify(summary));
      return { initialTasks: [], initialYesterday: summary };
    }

    return {
      initialTasks: oldTasks,
      initialYesterday,
    };
  });

  const [yesterday, setYesterday] = useState(preloaded.initialYesterday);
  const [tasks, setTasks] = useState(preloaded.initialTasks);

  const totalTasks = tasks.length;

  const completedTasks = tasks.filter((task) => task.completed).length;

  const remainingTasks = totalTasks - completedTasks;

  useEffect(() => {
    const isTouchDevice = window.matchMedia("(max-width: 640px)").matches;
    setIsMobile(isTouchDevice);

    const media = window.matchMedia("(max-width: 640px)");
    const handler = (event) => setIsMobile(event.matches);
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    const updateTimeLeft = () => {
      const now = new Date();

      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      const diff = Math.max(endOfDay - now, 0);

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      const formattedTime = `${hours.toString().padStart(2, "0")}h : ${minutes
        .toString()
        .padStart(2, "0")}m : ${seconds.toString().padStart(2, "0")}s`;

      setTimeLeft(formattedTime);
    };

    updateTimeLeft();

    const interval = setInterval(updateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const checkForNewDay = () => {
      const today = getTodayString();
      const savedDate = localStorage.getItem("lastDate");

      if (savedDate !== today) {
        const summary = createYesterdaySummary(
          tasks,
          savedDate || getYesterdayString(),
        );

        if (summary.completed === 0 && summary.remaining === 0) {
          setTasks([]);
          setYesterday(null);
          localStorage.removeItem("tasks");
          localStorage.removeItem("yesterdaySummary");
          localStorage.setItem("lastDate", today);
          return;
        }

        localStorage.setItem("yesterdaySummary", JSON.stringify(summary));
        setYesterday(summary);
        setTasks([]);
        localStorage.removeItem("tasks");
        localStorage.setItem("lastDate", today);
      }
    };

    checkForNewDay();
    const interval = setInterval(checkForNewDay, 1000);

    return () => clearInterval(interval);
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem("tasks", JSON.stringify(tasks));

    localStorage.setItem("lastDate", new Date().toDateString());
  }, [tasks]);

  const handleSubmit = () => {
    const splitTasks = text
      .split(/\n|,/)
      .map((task) => ({
        id: crypto.randomUUID(),
        text: task.trim(),
        completed: false,
      }))
      .filter((task) => task.text !== "");

    if (splitTasks.length === 0) return;

    setTasks((prevTasks) => [...prevTasks, ...splitTasks]);
    setText("");
  };

  const isSubmitDisabled = text.trim().length === 0;
  const [recentlyDeleted, setRecentlyDeleted] = useState(null);

  const progressMessage =
    totalTasks === 0
      ? "Add your first task to get today moving."
      : remainingTasks === 0
        ? "All done for today — nice work."
        : `${remainingTasks} left — keep the momentum.`;

  const toggleTask = (id) => {
    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task,
      ),
    );
  };
  const deleteTask = (idToDelete) => {
    setTasks((prevTasks) => {
      const index = prevTasks.findIndex((task) => task.id === idToDelete);
      if (index === -1) return prevTasks;

      const deletedTask = prevTasks[index];
      if (recentlyDeleted?.timerId) {
        clearTimeout(recentlyDeleted.timerId);
      }

      const timerId = window.setTimeout(() => {
        setRecentlyDeleted(null);
      }, 5000);

      setRecentlyDeleted({ task: deletedTask, index, timerId });
      return prevTasks.filter((task) => task.id !== idToDelete);
    });
  };

  const undoDelete = () => {
    if (!recentlyDeleted) return;

    setTasks((prevTasks) => {
      const nextTasks = [...prevTasks];
      nextTasks.splice(recentlyDeleted.index, 0, recentlyDeleted.task);
      return nextTasks;
    });

    if (recentlyDeleted.timerId) {
      clearTimeout(recentlyDeleted.timerId);
    }

    setRecentlyDeleted(null);
  };

  const dismissYesterdayReview = () => {
    setYesterday(null);

    localStorage.removeItem("yesterdaySummary");
  };

  const carryForwardTasks = () => {
    if (!yesterday?.unfinishedTasks?.length) return;

    const carriedTasks = yesterday.unfinishedTasks.map((task) => ({
      ...task,
      id: crypto.randomUUID(),
      completed: false,
    }));

    setTasks((prev) => [...carriedTasks, ...prev]);

    setYesterday(null);

    localStorage.removeItem("yesterdaySummary");
  };

  const yesterdayDate = new Date(Date.now() - 86400000).toDateString();

  const formattedReviewDate = yesterday?.date
    ? new Date(yesterday.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : "";

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-4 sm:px-6 animate-fade-in">
      <div className="mb-4 mt-3 flex flex-col items-center gap-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/20 bg-sky-500/5 px-4 py-2 text-xs uppercase tracking-[0.35em] text-sky-100 shadow-[0_18px_40px_-32px_rgba(56,189,248,0.9)] backdrop-blur-sm">
          <span className="font-semibold tracking-[0.45em]">
            BeforeMidnight
          </span>
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-zinc-300 uppercase tracking-[0.2em]">
            daily reset
          </span>
        </div>

        <p className="text-sm uppercase tracking-[0.3em] text-zinc-500 mb-0">
          Today Ends In
        </p>
      </div>

      <h1
        aria-live="polite"
        className="text-4xl sm:text-5xl md:text-7xl font-semibold tracking-tight tabular-nums bg-linear-to-r from-sky-300 via-cyan-200 to-sky-300 bg-clip-text text-transparent animate-countdown-pulse"
      >
        {timeLeft}
      </h1>

      <p className="text-zinc-600 text-sm mt-3">
        Tasks automatically reset at midnight.
      </p>

      <p className="text-zinc-500 text-center mt-4 mb-4 max-w-lg leading-relaxed">
        Everything resets at midnight. Focus on what matters today.
      </p>
      <p className="text-zinc-400 mb-2 text-center max-w-lg">
        {progressMessage}
      </p>
      <p className="text-zinc-400 mb-4 text-center">
        What needs to happen before today ends?
      </p>
      {yesterday && (
        <div className="w-full max-w-xl mb-6 p-5 rounded-2xl border border-zinc-800 bg-zinc-900 animate-slide-in-up">
          {yesterday.remaining === 0 ? (
            <>
              <p className="text-emerald-400 font-medium">
                {yesterday.date === yesterdayDate
                  ? "Great job yesterday."
                  : `Great job on ${formattedReviewDate}.`}
              </p>

              <p className="text-zinc-400 mt-1">
                You completed all {yesterday.completed} tasks.
              </p>

              <button
                onClick={dismissYesterdayReview}
                className="mt-4 px-4 py-2 rounded-xl border border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              >
                Dismiss
              </button>
            </>
          ) : (
            <>
              <p className="text-yellow-300 font-medium">
                {yesterday.date === yesterdayDate
                  ? "Yesterday review"
                  : `Review for ${formattedReviewDate}`}
              </p>

              <p className="text-zinc-400 mt-1">
                {yesterday.completed} completed • {yesterday.remaining}{" "}
                unfinished
              </p>

              <div className="flex gap-3 mt-4">
                <button
                  onClick={carryForwardTasks}
                  className="px-4 py-2 rounded-xl bg-white text-black font-medium hover:opacity-90"
                >
                  Continue unfinished tasks
                </button>

                <button
                  onClick={dismissYesterdayReview}
                  className="px-4 py-2 rounded-xl border border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                >
                  Dismiss
                </button>
              </div>
            </>
          )}
        </div>
      )}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8 text-sm text-zinc-400 w-full max-w-xl">
        <div className="w-full sm:w-auto px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-full text-center transition-all duration-300 hover:scale-[1.02]">
          {totalTasks} Total
        </div>

        <div className="w-full sm:w-auto px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-full text-center transition-all duration-300 hover:scale-[1.02]">
          {completedTasks} Done
        </div>

        <div className="w-full sm:w-auto px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-full text-center transition-all duration-300 hover:scale-[1.02]">
          {remainingTasks} Left
        </div>
      </div>

      <textarea
        autoFocus={!isMobile}
        value={text}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            handleSubmit();
          }
        }}
        onChange={(e) => setText(e.target.value)}
        placeholder={`Finish assignment
Go to gym
Reply to emails`}
        className="w-full max-w-xl h-40 bg-zinc-900 border border-zinc-800 rounded-2xl p-5 outline-none resize-none text-white placeholder:text-zinc-500 focus:border-sky-400 focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-black transition-shadow duration-300"
      />

      {recentlyDeleted && (
        <div className="w-full max-w-xl mb-4 mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-zinc-700 bg-zinc-950/90 px-4 py-3 text-sm text-zinc-100">
          <p className="text-zinc-300">
            Task deleted.
            <span className="text-zinc-400"> Undo within a few seconds.</span>
          </p>
          <button
            onClick={undoDelete}
            className="rounded-xl bg-white text-black px-4 py-2 font-medium hover:opacity-90"
          >
            Undo
          </button>
        </div>
      )}

      <div className="w-full max-w-xl flex flex-col items-center">
        <p className="text-xs text-zinc-500 text-right w-full mt-2 select-none hidden sm:block">
          Press{" "}
          <span className="font-medium text-zinc-100">Ctrl/Cmd + Enter</span> to
          save faster.
        </p>
        <p className="text-xs text-zinc-500 text-right w-full mt-2 select-none sm:hidden">
          Tap Save Today when you are ready.
        </p>

        <button
          onClick={handleSubmit}
          disabled={isSubmitDisabled}
          className={`mt-4 block w-full sm:w-auto mx-auto px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
            isSubmitDisabled
              ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
              : "bg-white text-black hover:opacity-90 hover:shadow-[0_20px_45px_-24px_rgba(255,255,255,0.9)] active:scale-[0.98]"
          }`}
        >
          Save Today
        </button>
      </div>

      <div className="mt-10 w-full max-w-xl">
        {tasks.length === 0 && (
          <div className="text-center text-zinc-600 border border-zinc-800 rounded-2xl p-8">
            A fresh day. A clean slate.
          </div>
        )}

        {tasks.map((task) => (
          <div
            key={task.id}
            className="group p-4 bg-zinc-900/80 border border-zinc-800 rounded-2xl mb-3 transition-all duration-200 ease-out hover:border-zinc-700 hover:-translate-y-px animate-slide-in-up"
          >
            <div className="flex items-center justify-between w-full gap-4">
              <p
                className={`text-[15px] leading-relaxed transition-all ${
                  task.completed
                    ? "line-through text-zinc-500 opacity-70"
                    : "text-zinc-100"
                }`}
              >
                {task.text}
              </p>

              <div className="flex items-center gap-5 shrink-0">
                <input
                  aria-label="Mark task complete"
                  title="Mark as complete"
                  type="checkbox"
                  checked={task.completed}
                  onChange={() => toggleTask(task.id)}
                  className="h-4 w-5 cursor-pointer rounded border-zinc-600 bg-zinc-800 accent-emerald-500 transition-all"
                />

                <button
                  aria-label="Delete task"
                  title="Delete task"
                  onClick={() => deleteTask(task.id)}
                  className="text-zinc-500 hover:text-red-300 transition-all opacity-70 hover:opacity-100"
                >
                  <i className="fa-regular fa-trash-can"></i>
                </button>
              </div>
            </div>
          </div>
        ))}

        <div className="select-none">
          <p className="text-xs text-zinc-700 mt-6 text-center">
            Stored locally on your device only • One day at a time
          </p>

          <p className="text-xs text-zinc-700 text-center mb-5 mt-2 tracking-wide">
            Made with love by{" "}
            <a
              href="https://bio.link/anooppushpad"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors duration-200 hover:text-stone-300"
            >
              Anoop Pushpad
            </a>
            <span className="mx-1 text-zinc-600">•</span>
            <a
              href="https://github.com/AnoopPushpad/BeforeMidnight/"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors duration-200 hover:text-stone-300"
            >
              ★ GitHub
            </a>
            <span className="mx-1 text-zinc-600">•</span>
            <a
              href="https://www.producthunt.com/products/beforemidnight"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors duration-200 hover:text-stone-300"
            >
              Product Hunt
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}

export default App;
