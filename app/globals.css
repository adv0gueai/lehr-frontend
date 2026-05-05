@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --background: #ffffff;
  --foreground: #0f172a;
  --card: #ffffff;
  --card-foreground: #0f172a;
  --popover: #ffffff;
  --popover-foreground: #0f172a;
  --primary: #0ea5e9;
  --primary-foreground: #f8fafc;
  --secondary: #f1f5f9;
  --secondary-foreground: #0f172a;
  --muted: #f1f5f9;
  --muted-foreground: #64748b;
  --accent: #f1f5f9;
  --accent-foreground: #0f172a;
  --destructive: #ef4444;
  --destructive-foreground: #f8fafc;
  --border: #e2e8f0;
  --input: #e2e8f0;
  --ring: #0ea5e9;
  --radius: 0.5rem;
}

.dark {
  --background: #020617;
  --foreground: #f8fafc;
  --card: #0f172a;
  --card-foreground: #f8fafc;
  --popover: #0f172a;
  --popover-foreground: #f8fafc;
  --primary: #0ea5e9;
  --primary-foreground: #020617;
  --secondary: #1e293b;
  --secondary-foreground: #f8fafc;
  --muted: #1e293b;
  --muted-foreground: #94a3b8;
  --accent: #1e293b;
  --accent-foreground: #f8fafc;
  --destructive: #ef4444;
  --destructive-foreground: #f8fafc;
  --border: #1e293b;
  --input: #1e293b;
  --ring: #0ea5e9;
}

* {
  @apply border-gray-200 dark:border-gray-800;
}

body {
  background-color: var(--background);
  color: var(--foreground);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
}

/* Modern scrollbar styles */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  @apply bg-gray-100 dark:bg-gray-800;
}

::-webkit-scrollbar-thumb {
  @apply bg-gray-300 dark:bg-gray-600 rounded-full;
}

::-webkit-scrollbar-thumb:hover {
  @apply bg-gray-400 dark:bg-gray-500;
}

/* Modern card styles */
.modern-card {
  @apply bg-white dark:bg-gray-900 rounded-xl shadow-soft border border-gray-100 dark:border-gray-800;
}

.modern-card-hover {
  @apply modern-card hover:shadow-medium transition-all duration-200;
}

/* Gradient text effects */
.gradient-text {
  @apply bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent;
}

/* Modern button styles */
.btn-modern {
  @apply px-4 py-2 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2;
}

.btn-primary {
  @apply btn-modern bg-primary-600 hover:bg-primary-700 text-white focus:ring-primary-500;
}

.btn-secondary {
  @apply btn-modern bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-gray-500;
}

/* Animation utilities */
@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in {
  animation: fade-in 0.5s ease-out;
}

@keyframes slide-in {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.animate-slide-in {
  animation: slide-in 0.3s ease-out;
}

/* Custom DatePicker Styles */
.react-datepicker-wrapper {
  width: 100%;
}

.react-datepicker__input-container {
  width: 100%;
}

.react-datepicker {
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  font-family: inherit;
}

.react-datepicker__header {
  background-color: #f3f4f6;
  border-bottom: 1px solid #e5e7eb;
  border-radius: 0.5rem 0.5rem 0 0;
}

.react-datepicker__current-month {
  color: #1f2937;
  font-weight: 600;
}

.react-datepicker__day {
  color: #374151;
}

.react-datepicker__day:hover {
  background-color: #dbeafe;
  color: #1d4ed8;
}

.react-datepicker__day--selected {
  background-color: #3b82f6 !important;
  color: white !important;
}

.react-datepicker__day--selected:hover {
  background-color: #2563eb !important;
}

.react-datepicker__day--disabled {
  color: #9ca3af;
}

.react-datepicker__navigation {
  top: 13px;
}

.react-datepicker__navigation--previous {
  border-right-color: #6b7280;
}

.react-datepicker__navigation--next {
  border-left-color: #6b7280;
}

.react-datepicker__navigation:hover::before {
  border-color: #3b82f6;
}

/* Modal Styles */
.modal-backdrop {
  backdrop-filter: blur(4px);
}

/* Scrollbar styles for modal */
.modal-content::-webkit-scrollbar {
  width: 6px;
}

.modal-content::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.modal-content::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.modal-content::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}