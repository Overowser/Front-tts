import { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';
import {
  TextField, Button, Tooltip, CssBaseline,
  CircularProgress, Box, Typography, Paper, IconButton,
  Container, Grid, Slider, Divider, Card, CardContent,
  CardMedia, CardActionArea
} from '@mui/material';
import {
  Send as SendIcon,
  ContentCopy as ContentCopyIcon,
  Check as CheckIcon,
  Save as SaveIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Stop as StopIcon,
  Speed as SpeedIcon
} from '@mui/icons-material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { green, blue, grey } from '@mui/material/colors';

// Helper function (assuming it's needed for the theme highlight)
function alpha(color, value) {
    if (color.startsWith('#') && color.length === 7) {
        const clampedValue = Math.max(0, Math.min(1, value));
        const alphaHex = Math.round(clampedValue * 255).toString(16).padStart(2, '0');
        return `${color}${alphaHex}`;
    }
    console.warn("Alpha function basic implementation used.");
    return color;
}


const App = () => {
  // Core state management
  const [keyword, setKeyword] = useState('infinite mana in the apocalypse');
  const [chapter, setChapter] = useState(1);
  const [chapterCount, setChapterCount] = useState(1);
  const [novelText, setNovelText] = useState('');
  const [formattedText, setFormattedText] = useState('');
  const [textArray, setTextArray] = useState([]);
  const [title, setTitle] = useState('Novel Reader');
  const [image, setImage] = useState('./logo192.png');

  // UI state management
  const [isPlaying, setIsPlaying] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [readingRate, setReadingRate] = useState(1);

  // Refs
  const ttsRef = useRef(null);
  const currentParaRef = useRef(0);
  const timerRef = useRef(null);
  const isPlayingRef = useRef(isPlaying); // Ref to track isPlaying state within async callbacks

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);


  // --- Theme and Styles ---
  const darkTheme = createTheme({
      palette: {
        mode: 'dark',
        primary: { main: blue[400] },
        secondary: { main: green[400] },
        background: { default: '#121212', paper: '#1E1E1E' },
      },
      typography: {
        fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
        h1: { fontSize: '2.5rem', fontWeight: 500 },
        body1: { fontSize: '1rem', lineHeight: 1.6 },
      },
      components: {
        MuiTextField: { styleOverrides: { root: { backgroundColor: 'rgba(31, 31, 31, 0.8)' }}},
        MuiPaper: { styleOverrides: { root: { borderRadius: 8, backgroundColor: 'rgba(31, 31, 31, 0.9)' }}},
        MuiButton: { styleOverrides: { root: { borderRadius: 8, textTransform: 'none', padding: '8px 16px' }}},
      },
  });

  const backgroundStyle = {
      backgroundImage: "url('background.png')",
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundAttachment: "fixed",
      minHeight: "100vh",
      width: "100%",
      paddingTop: "24px",
      paddingBottom: "24px",
  };
  // --- End Theme and Styles ---


  const highlightParagraph = useCallback((index) => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = novelText;
    const existingHighlights = tempDiv.querySelectorAll('.highlight');
    existingHighlights.forEach(el => el.classList.remove('highlight'));
    if (index >= 0 && index < textArray.length) {
      const parElement = tempDiv.querySelector(`#par${index}`);
      if (parElement) {
        parElement.classList.add('highlight');
      } else {
        console.warn(`Paragraph element #par${index} not found for highlighting.`);
      }
    }
    setFormattedText(tempDiv.innerHTML);
  }, [novelText, textArray.length]);


  const speakParagraph = useCallback((index) => {
      if (!ttsRef.current || !textArray || index < 0 || index >= textArray.length) {
          console.log("Cannot speak paragraph: Invalid index or TTS not ready.", index, textArray?.length);
          setIsPlaying(false);
          return;
      }
      const textToSpeak = textArray[index];
      console.log(`Requesting speech for paragraph ${index}: "${textToSpeak.substring(0, 50)}..."`);
      highlightParagraph(index);
      ttsRef.current.speakOut(textToSpeak);
  }, [textArray, highlightParagraph]);


  useEffect(() => {
    if (!window.wsGlobals || !window.wsGlobals.TtsEngine) {
      console.error("TTS engine (wsGlobals.TtsEngine) is not available.");
      return;
    }
    const tts = window.wsGlobals.TtsEngine;
    ttsRef.current = tts;

    const handleSpeechDone = () => {
      console.log("Speech 'onDone' triggered.");
      if (!isPlayingRef.current) {
          console.log("Speech done, but not in playing state (likely stopped manually or during rate change). Stopping.");
          return;
      }
      const nextParaIndex = currentParaRef.current + 1;
      if (nextParaIndex < textArray.length) {
          console.log(`Finished paragraph ${currentParaRef.current}, preparing next (${nextParaIndex})`);
          currentParaRef.current = nextParaIndex;
          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = setTimeout(() => {
              if (isPlayingRef.current) {
                speakParagraph(currentParaRef.current);
              } else {
                console.log("Timer fired, but no longer in playing state.");
              }
          }, 200);
      } else {
          console.log("End of text reached.");
          setIsPlaying(false);
          currentParaRef.current = 0;
          highlightParagraph(-1);
      }
    };

    tts.init({
      onInit: (voices) => {
        console.log("TTS Initialized.");
        tts.setRate(readingRate);
        try {
            tts.setVoiceByUri("urn:moz-tts:sapi:Microsoft Zira Desktop - English (United States)?en-US");
        } catch (e) {
            console.warn("Could not set preferred voice, using default.", e);
        }
      },
      onStart: () => { console.log("Speech started for a segment."); },
      onDone: handleSpeechDone,
      onError: (err) => {
        console.error("TTS Error:", err);
        setIsPlaying(false);
        highlightParagraph(-1);
      }
    });

    return () => {
      console.log("Cleaning up TTS effect");
      if (timerRef.current) clearTimeout(timerRef.current);
      if (ttsRef.current) {
        ttsRef.current.stop();
      }
      ttsRef.current = null;
    };
  }, [textArray, readingRate, speakParagraph]); // Dependency array includes readingRate now


  const saveTextToFile = useCallback((text) => {
    if (!text) {
        console.log("No text content to save.");
        return;
    }
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const sanitize = (str) => str.replace(/[^a-z0-9_-]/gi, '_').substring(0, 50);
    const safeKeyword = sanitize(keyword);
    const safeTitle = title && title !== 'Novel Reader' ? sanitize(title) : safeKeyword;
    link.download = `${safeTitle}_Ch${chapter}_Count${chapterCount}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    console.log("Text download initiated.");
  }, [keyword, chapter, chapterCount, title]);


  const fetchNovel = async () => {
    if (isLoading) return;
    handleStop(); // Stop playback before fetching
    setIsSuccess(false);
    setIsLoading(true);
    setNovelText('');
    setFormattedText('');
    setTextArray([]);

    try {
      const response = await fetch('http://127.0.0.1:5000/api/', { // Replace with env variable
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        mode: 'cors',
        body: JSON.stringify({
            keyword,
            chapter: Number(chapter),
            number: Number(chapterCount)
        }),
      });
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const result = await response.json();
      if (!result || typeof result.formatted !== 'string' || !Array.isArray(result.array)) {
         throw new Error("Invalid response format from server");
      }
      setNovelText(result.formatted);
      setFormattedText(result.formatted);
      setTextArray(result.array);
      setTitle(result.title || 'Novel Reader');
      setImage(result.image || './logo192.png');
      currentParaRef.current = 0;
      setIsPlaying(false);
      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 2000);
    } catch (error) {
      console.error('Error fetching novel:', error);
      setFormattedText(`<p style="color: red;">Error loading chapter: ${error.message}. Please check the keyword and chapter number, and ensure the backend server is running.</p>`);
      setTextArray([]);
      setTitle('Error');
      setImage('./logo192.png');
    } finally {
      setIsLoading(false);
    }
  };


  // --- Control Handlers ---

  const handlePlayPause = () => {
      if (!ttsRef.current || textArray.length === 0) {
          console.log("Cannot play/pause: TTS not ready or no text loaded.");
          return;
      }
      if (isPlaying) {
          console.log("Pausing speech.");
          setIsPlaying(false); // State change triggers isPlayingRef update via useEffect
          if (timerRef.current) clearTimeout(timerRef.current);
          if (ttsRef.current) ttsRef.current.stop();
      } else {
          console.log(`Playing/Resuming from paragraph: ${currentParaRef.current}`);
          setIsPlaying(true); // State change triggers isPlayingRef update via useEffect
          speakParagraph(currentParaRef.current);
      }
  };

  const handleStop = () => {
      console.log("Stopping speech.");
      setIsPlaying(false); // State change triggers isPlayingRef update via useEffect
      if (timerRef.current) clearTimeout(timerRef.current);
      if (ttsRef.current) {
          ttsRef.current.stop();
      }
      currentParaRef.current = 0;
      highlightParagraph(-1);
  };

  // --- CORRECTED FUNCTION ---
  const handleRateChange = (event, newValue) => {
      const newRate = Number(newValue);
      setReadingRate(newRate); // Update state

      // Update the TTS engine's rate if it's initialized
      if (ttsRef.current) {
          ttsRef.current.setRate(newRate);
      }

      // If currently playing, stop the current speech and restart from the same paragraph
      // with the new rate.
      if (isPlaying && ttsRef.current) {
          const paraIndexToRestart = currentParaRef.current;

          // --- START FIX ---
          // Temporarily set the isPlayingRef to false *before* stopping speech.
          // This prevents the onDone handler from incorrectly advancing the paragraph
          // when it's triggered by this intentional stop.
          isPlayingRef.current = false;
          // --- END FIX ---

          ttsRef.current.stop(); // Stop current speech utterance

          // Clear any existing timer for the next paragraph delay
          if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null; // Nullify ref after clearing
          }

          // Add a tiny delay before restarting speech.
          // This allows the stop() command to fully process.
          setTimeout(() => {
              // --- START FIX ---
              // Check the actual 'isPlaying' state variable here.
              // This ensures we only restart if the user hasn't manually paused or stopped
              // during this brief delay period.
              if (isPlaying) {
                  // Restore the isPlayingRef to true *before* speaking again
                  isPlayingRef.current = true;
               // --- END FIX ---
                  console.log(`Restarting speech for paragraph ${paraIndexToRestart} with new rate.`);
                  // Ensure we use the stored paragraph index, not one potentially incremented by onDone
                  currentParaRef.current = paraIndexToRestart;
                  speakParagraph(currentParaRef.current); // Restart speech
              } else {
                 // If user stopped playback during the brief rate change delay, ensure ref remains false
                 isPlayingRef.current = false;
                 console.log("Rate changed, but playback was stopped by user during the delay.");
              }
          }, 50); // 50ms delay, might need minor adjustment based on TTS engine responsiveness
      }
  };
  // --- END CORRECTED FUNCTION ---


  const handleCopyToClipboard = async () => {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = novelText;
      const plainText = tempDiv.textContent || tempDiv.innerText || "";
      if (!plainText) {
          console.log("No text content to copy.");
          return;
      }
      try {
          await navigator.clipboard.writeText(plainText);
          setIsCopied(true);
          setTimeout(() => setIsCopied(false), 2000);
      } catch (err) {
          console.error('Failed to copy text: ', err);
      }
  };

  const handleDownloadText = useCallback(() => {
      if (!textArray || textArray.length === 0) {
        console.log("No text content (from textArray) to download.");
        return;
      }
      const plainTextWithNewlines = textArray.join('\n\n');
      saveTextToFile(plainTextWithNewlines);
  }, [textArray, saveTextToFile]);


  // --- JSX Rendering ---
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Box style={backgroundStyle}>
        <Container maxWidth="lg">

          {/* Novel Header Card */}
          <Card elevation={6} sx={{ mb: 4, overflow: 'hidden' }}>
            <CardActionArea>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CardMedia
                  component="img"
                  sx={{ width: { xs: 100, sm: 140 }, height: { xs: 150, sm: 200 }, objectFit: 'cover', flexShrink: 0 }}
                  image={image}
                  alt={title}
                  onError={(e) => { e.target.onerror = null; e.target.src = './logo192.png'; }}
                />
                <CardContent sx={{ flex: '1 1 auto', p: { xs: 2, md: 3 } }}>
                  <Typography variant="h4" component="h1" gutterBottom noWrap title={title}>
                    {title}
                  </Typography>
                  <Typography variant="subtitle1" color="text.secondary">
                    Chapter {chapter} {chapterCount > 1 ? `(Fetching ${chapterCount})` : ''}
                  </Typography>
                   <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                     Keyword: {keyword}
                   </Typography>
                </CardContent>
              </Box>
            </CardActionArea>
          </Card>

          {/* Controls Section */}
          <Paper elevation={4} sx={{ p: { xs: 2, md: 3 }, mb: 4 }}>
            <Grid container spacing={2} alignItems="center">
              {/* Inputs */}
              <Grid item xs={12} md={5}>
                <TextField label="Novel Keyword/Name" variant="outlined" fullWidth value={keyword} onChange={(e) => setKeyword(e.target.value)} size="small" disabled={isLoading} />
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <TextField label="Start Ch." type="number" variant="outlined" fullWidth value={chapter} onChange={(e) => setChapter(Math.max(1, Number(e.target.value)))} InputProps={{ inputProps: { min: 1 } }} size="small" disabled={isLoading} />
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <TextField label="# Chapters" type="number" variant="outlined" fullWidth value={chapterCount} onChange={(e) => setChapterCount(Math.max(1, Number(e.target.value)))} InputProps={{ inputProps: { min: 1 } }} size="small" disabled={isLoading} />
              </Grid>
              {/* Load Button */}
              <Grid item xs={12} sm={4} md={3} sx={{ display: 'flex', justifyContent: { xs: 'center', md: 'flex-end' } }}>
                <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                  <Button variant="contained" color={isSuccess ? "success" : "primary"} size="medium" disabled={isLoading} startIcon={isLoading ? null : (isSuccess ? <CheckIcon /> : <SendIcon />)} onClick={fetchNovel} sx={{ px: 3, py: 1, minWidth: '100px' }}>
                    {isLoading ? <CircularProgress size={24} color="inherit" /> : (isSuccess ? 'Loaded' : 'Load')}
                  </Button>
                </Box>
              </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />

            {/* Playback Controls */}
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {/* Play/Pause */}
                  <Tooltip title={isPlaying ? "Pause" : "Play"}>
                    <span> {/* Span for tooltip when disabled */}
                      <IconButton onClick={handlePlayPause} color="primary" size="large" disabled={isLoading || textArray.length === 0} aria-label={isPlaying ? "Pause" : "Play"}>
                        {isPlaying ? <PauseIcon fontSize="large"/> : <PlayIcon fontSize="large"/>}
                      </IconButton>
                    </span>
                  </Tooltip>
                  {/* Stop */}
                  <Tooltip title="Stop and Reset">
                     <span> {/* Span for tooltip when disabled */}
                        <IconButton onClick={handleStop} color="secondary" size="large" disabled={isLoading || textArray.length === 0} aria-label="Stop">
                          <StopIcon fontSize="large"/>
                        </IconButton>
                      </span>
                  </Tooltip>
                  {/* Speed Slider */}
                  <Box sx={{ display: 'flex', alignItems: 'center', ml: 2, flexGrow: 1, minWidth: 150 }}>
                    <Tooltip title="Reading Speed">
                      <SpeedIcon color="action" sx={{ mr: 1 }} />
                    </Tooltip>
                    <Slider
                      value={readingRate} min={0.5} max={2.5} step={0.1}
                      onChange={handleRateChange} aria-labelledby="reading-speed-slider"
                      valueLabelDisplay="auto" valueLabelFormat={(value) => `${value.toFixed(1)}x`}
                      size="small" disabled={isLoading || textArray.length === 0}
                    />
                  </Box>
                </Box>
              </Grid>
              {/* Status Text */}
              <Grid item xs={12} md={6}>
                 <Typography variant="body2" color="text.secondary" textAlign={{xs: 'left', md: 'right'}} sx={{ mt: { xs: 2, md: 0 } }}>
                   {isLoading ? 'Loading...' : ( isPlaying ? `Reading: Paragraph ${currentParaRef.current + 1} / ${textArray.length}` : (textArray.length > 0 ? `Ready (${currentParaRef.current + 1}/${textArray.length})` : 'Load novel to start') )}
                 </Typography>
              </Grid>
            </Grid>
          </Paper>

          {/* Novel Content Display Area */}
          <Paper elevation={5} sx={{ p: { xs: 2, md: 4 }, mb: 3, minHeight: '400px', maxHeight: '70vh', overflowY: 'auto' }}>
             {/* Header */}
             <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, borderBottom: 1, borderColor: 'divider', pb: 1 }}>
               <Typography variant="h6" component="h2">Novel Content</Typography>
               <Box sx={{ display: 'flex', gap: 0.5 }}>
                 {/* Copy Button */}
                 <Tooltip title={isCopied ? "Copied!" : "Copy text content"}>
                   <span>
                     <IconButton onClick={handleCopyToClipboard} disabled={isLoading || novelText.length === 0} aria-label="Copy text content">
                       {isCopied ? <CheckIcon color="success" /> : <ContentCopyIcon />}
                     </IconButton>
                   </span>
                 </Tooltip>
                 {/* Download Button */}
                 <Tooltip title="Download as .txt">
                    <span>
                        <IconButton onClick={handleDownloadText} disabled={isLoading || textArray.length === 0} aria-label="Download text file">
                            <SaveIcon />
                        </IconButton>
                    </span>
                 </Tooltip>
               </Box>
             </Box>
             {/* Content */}
            <Box
              id="novel-content-area"
              sx={{
                whiteSpace: 'pre-wrap', textAlign: 'left', color: grey[300],
                fontSize: '1.1rem', lineHeight: 1.7,
                '& p': { marginBottom: '1em', marginTop: '0' },
                '& .highlight': {
                  backgroundColor: alpha(darkTheme.palette.primary.main, 0.2),
                  borderRadius: '4px', padding: '0 4px',
                  boxDecorationBreak: 'clone', WebkitBoxDecorationBreak: 'clone',
                  transition: 'background-color 0.3s ease-in-out',
                }
              }}
              dangerouslySetInnerHTML={{ __html: formattedText || "<p>Load a novel using the controls above.</p>" }}
            />
          </Paper>

          {/* Footer */}
          <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mt: 4, pb: 2 }}>
            NovAI - Novel Reader App © 2025
          </Typography>
        </Container>
      </Box>
    </ThemeProvider>
  );
};

export default App;