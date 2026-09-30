const pad = (value) => String(value).padStart(2, '0');

// Seconds → "mm:ss".
const formatTime = (seconds) => `${pad(Math.floor(seconds / 60))}:${pad(seconds % 60)}`;

export default formatTime;
