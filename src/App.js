import { useState, useEffect, useRef, useCallback } from 'react'; // Added useCallback
import './App.css';
import {
  TextField, Button, Tooltip, CssBaseline, Fab,
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
  VolumeUp as VolumeIcon,
  Speed as SpeedIcon
} from '@mui/icons-material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { green, blue, grey } from '@mui/material/colors';

const App = () => {
  // Core state management
  const [keyword, setKeyword] = useState('infinite mana in the apocalypse');
  const [chapter, setChapter] = useState(1);
  const [chapterCount, setChapterCount] = useState(1);
  const [novelText, setNovelText] = useState(''); // Raw HTML from backend
  const [formattedText, setFormattedText] = useState(''); // HTML potentially with highlight class
  const [textArray, setTextArray] = useState([]); // Array of plain text paragraphs
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
  const timerRef = useRef(null); // For delay between paragraphs
  const isPlayingRef = useRef(isPlaying); // Ref to track isPlaying within callbacks

  // Keep isPlayingRef updated
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);


  // --- Theme and Styles --- (Keep your theme and styles as they are)
  const darkTheme = createTheme({
      palette: {
        mode: 'dark',
        primary: {
          main: blue[400],
        },
        secondary: {
          main: green[400],
        },
        background: {
          default: '#121212',
          paper: '#1E1E1E',
        },
      },
      typography: {
        fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
        h1: {
          fontSize: '2.5rem',
          fontWeight: 500,
        },
        body1: {
          fontSize: '1rem',
          lineHeight: 1.6,
        },
      },
      components: {
        MuiTextField: {
          styleOverrides: {
            root: {
              backgroundColor: 'rgba(31, 31, 31, 0.8)',
            },
          },
        },
        MuiPaper: {
          styleOverrides: {
            root: {
              borderRadius: 8,
              backgroundColor: 'rgba(31, 31, 31, 0.9)',
            },
          },
        },
        MuiButton: {
          styleOverrides: {
            root: {
              borderRadius: 8,
              textTransform: 'none',
              padding: '8px 16px',
            },
          },
        },
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


  // Utility function to highlight paragraph
  const highlightParagraph = useCallback((index) => {
    // Use novelText (original HTML) as the base
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = novelText; // Start from the clean HTML

    // Remove any existing highlights first (important if called repeatedly)
    const existingHighlights = tempDiv.querySelectorAll('.highlight');
    existingHighlights.forEach(el => el.classList.remove('highlight'));

    if (index >= 0 && index < textArray.length) {
      // Add highlight to the specified paragraph
      const parElement = tempDiv.querySelector(`#par${index}`);
      if (parElement) {
        parElement.classList.add('highlight');
        // Optional: Scroll into view
        // parElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        console.warn(`Paragraph element #par${index} not found for highlighting.`);
      }
    }

    setFormattedText(tempDiv.innerHTML);
  }, [novelText, textArray.length]); // Depends on the original text and array length


  // Function to speak a specific paragraph
  const speakParagraph = useCallback((index) => {
      if (!ttsRef.current || !textArray || index < 0 || index >= textArray.length) {
          console.log("Cannot speak paragraph: Invalid index or TTS not ready.", index, textArray?.length);
          setIsPlaying(false); // Stop if we can't speak
          return;
      }

      const textToSpeak = textArray[index];
      console.log(`Requesting speech for paragraph ${index}: "${textToSpeak.substring(0, 50)}..."`);
      highlightParagraph(index);
      ttsRef.current.speakOut(textToSpeak);

  }, [textArray, highlightParagraph]); // Depends on textArray and highlightParagraph


  // Effect for TTS Initialization and Cleanup
  useEffect(() => {
    if (!window.wsGlobals || !window.wsGlobals.TtsEngine) {
      console.error("TTS engine (wsGlobals.TtsEngine) is not available.");
      return;
    }

    const tts = window.wsGlobals.TtsEngine;
    ttsRef.current = tts;

    const handleSpeechDone = () => {
      console.log("Speech 'onDone' triggered.");

      // IMPORTANT: Only proceed if we are *supposed* to be playing.
      // Use the ref here as the state might be stale in the callback closure.
      if (!isPlayingRef.current) {
          console.log("Speech done, but not in playing state. Stopping.");
          return;
      }

      // Speech finished naturally, advance to the next paragraph
      const nextParaIndex = currentParaRef.current + 1;

      if (nextParaIndex < textArray.length) {
          console.log(`Finished paragraph ${currentParaRef.current}, preparing next (${nextParaIndex})`);
          currentParaRef.current = nextParaIndex;
          // Add a small delay before speaking the next paragraph
          if (timerRef.current) clearTimeout(timerRef.current); // Clear previous timer if any
          timerRef.current = setTimeout(() => {
              speakParagraph(currentParaRef.current);
          }, 200); // 200ms delay
      } else {
          // Reached the end of the text
          console.log("End of text reached.");
          setIsPlaying(false);
          currentParaRef.current = 0; // Reset to start for next play
          highlightParagraph(-1); // Remove highlights
      }
    };

    // Initialize TTS
    tts.init({
      onInit: (voices) => {
        console.log("TTS Initialized.");
        tts.setRate(readingRate); // Set initial rate
        // Consider making voice selection more robust or configurable
        try {
           tts.setVoiceByUri("urn:moz-tts:sapi:Microsoft Zira Desktop - English (United States)?en-US");
        } catch (e) {
            console.warn("Could not set preferred voice, using default.", e);
        }
      },
      onStart: () => {
        console.log("Speech started");
      },
      onDone: handleSpeechDone, // Assign the handler
      // onError: (err) => { // Optional: Add error handling
      //   console.error("TTS Error:", err);
      //   setIsPlaying(false);
      //   highlightParagraph(-1);
      // }
    });

    // Cleanup function
    return () => {
      console.log("Cleaning up TTS effect");
      if (timerRef.current) clearTimeout(timerRef.current);
      if (ttsRef.current) {
        ttsRef.current.stop(); // Stop any ongoing speech
        // Potentially add tts.shutdown() or similar if the library supports it
      }
      ttsRef.current = null; // Clear the ref
    };
    // Rerun this effect ONLY if textArray changes (new content loaded) or readingRate changes
    // We don't want it running on every isPlaying change anymore.
  }, [textArray, readingRate, speakParagraph]); // Include speakParagraph because it's used in onDone logic indirectly


  // API call to fetch novel content
  const fetchNovel = async () => {
    if (isLoading) return;

    handleStop(); // Stop any current reading before fetching new content
    setIsSuccess(false);
    setIsLoading(true);
    setNovelText(''); // Clear previous text
    setFormattedText('');
    setTextArray([]);

    try {
      const response = await fetch('http://127.0.0.1:5000/api/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // 'Access-Control-Allow-Origin': '*', // Usually not needed for client-side fetch
        },
        mode: 'cors',
        body: JSON.stringify({ keyword, chapter: Number(chapter), number: Number(chapterCount) }), // Ensure numbers are sent
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const result = await response.json();

      // Basic validation of response
      if (!result || typeof result.formatted !== 'string' || !Array.isArray(result.array)) {
         throw new Error("Invalid response format from server");
      }

      setNovelText(result.formatted);   // Store the raw HTML
      setFormattedText(result.formatted); // Initially display raw HTML
      setTextArray(result.array);       // Store the plain text paragraphs
      setTitle(result.title || 'Novel Reader');
      setImage(result.image || './logo192.png');

      // Reset reading state for the new content
      currentParaRef.current = 0;
      setIsPlaying(false); // Ensure it starts paused

      // Optional: Auto-save removed for simplicity, re-add if needed
      // saveTextToFile(result.text); // Assuming result.text is plain text for saving

      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 2000); // Reset success state after a delay

    } catch (error) {
      console.error('Error fetching novel:', error);
      setFormattedText(`<p style="color: red;">Error loading chapter: ${error.message}</p>`); // Show error in UI
    } finally {
      setIsLoading(false);
    }
  };


  // --- Control Handlers ---

  const handlePlayPause = () => {
      if (!ttsRef.current || textArray.length === 0) {
          console.log("Cannot play: TTS not ready or no text loaded.");
          return;
      }

      if (isPlaying) {
          // PAUSE action
          console.log("Pausing speech.");
          setIsPlaying(false);
          if (timerRef.current) clearTimeout(timerRef.current);
          ttsRef.current.stop(); 
      } else {
          // PLAY action
          console.log(`Playing from paragraph: ${currentParaRef.current}`);
          setIsPlaying(true);
          // Resume from the current paragraph index
          speakParagraph(currentParaRef.current);
      }
  };

  const handleStop = () => {
      console.log("Stopping speech.");
      setIsPlaying(false);
      if (timerRef.current) clearTimeout(timerRef.current); // Clear pending timer
      if (ttsRef.current) {
          ttsRef.current.stop();
      }
      currentParaRef.current = 0; // Reset to the beginning
      highlightParagraph(-1); // Remove highlights
  };

  const handleRateChange = (event, newValue) => {
      setReadingRate(newValue);
      if (ttsRef.current) {
          ttsRef.current.setRate(newValue);
      }
  };

  const handleCopyToClipboard = async () => {
      // Create a temporary element to parse HTML and get text content
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = novelText; // Use the original fetched HTML
      const plainText = tempDiv.textContent || tempDiv.innerText || "";

      try {
          await navigator.clipboard.writeText(plainText);
          setIsCopied(true);
          setTimeout(() => setIsCopied(false), 2000);
      } catch (err) {
          console.error('Failed to copy text: ', err);
      }
  };

  // Keep saveTextToFile function as it was, if needed
  const saveTextToFile = (text) => {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' }); // Ensure UTF-8
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    // Sanitize filename (basic example)
    const safeKeyword = keyword.replace(/[^a-z0-9_\-]/gi, '_').substring(0, 50);
    link.download = `${safeKeyword}_Ch${chapter}_Count${chapterCount}.txt`;
    document.body.appendChild(link); // Required for Firefox
    link.click();
    document.body.removeChild(link); // Clean up
    URL.revokeObjectURL(url);
  };


  // --- JSX Rendering ---
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Box style={backgroundStyle}>
        <Container maxWidth="lg">
          {/* Novel Header Card */}
          <Card elevation={6} sx={{ mb: 4, overflow: 'hidden' }}>
            <CardActionArea> {/* Optional: Add onClick if needed */}
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CardMedia
                  component="img"
                  sx={{ width: 140, height: 200, objectFit: 'cover', flexShrink: 0 }}
                  image={image}
                  alt={title}
                />
                <CardContent sx={{ flex: '1 1 auto', p: { xs: 2, md: 3 } }}>
                  <Typography variant="h4" component="h1" gutterBottom noWrap title={title}>
                    {title}
                  </Typography>
                  <Typography variant="subtitle1" color="text.secondary">
                    Chapter {chapter} {chapterCount > 1 ? `(Fetching ${chapterCount})` : ''}
                  </Typography>
                  {/* Maybe add keyword here too */}
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
              {/* Input Fields */}
              <Grid item xs={12} md={5}>
                <TextField
                  label="Novel Keyword/Name"
                  variant="outlined"
                  fullWidth
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  size="small"
                />
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <TextField
                  label="Start Ch."
                  type="number"
                  variant="outlined"
                  fullWidth
                  value={chapter}
                  onChange={(e) => setChapter(Math.max(1, Number(e.target.value)))} // Prevent negative/zero
                  InputProps={{ inputProps: { min: 1 } }}
                   size="small"
                />
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <TextField
                  label="# Chapters"
                  type="number"
                  variant="outlined"
                  fullWidth
                  value={chapterCount}
                  onChange={(e) => setChapterCount(Math.max(1, Number(e.target.value)))} // Prevent negative/zero
                  InputProps={{ inputProps: { min: 1 } }}
                   size="small"
                />
              </Grid>
              {/* Load Button */}
              <Grid item xs={12} sm={4} md={3} sx={{ display: 'flex', justifyContent: { xs: 'center', md: 'flex-end' } }}>
                <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                  <Button
                    variant="contained"
                    color={isSuccess ? "success" : "primary"}
                    size="medium" // Adjusted size
                    disabled={isLoading}
                    startIcon={isLoading ? null : (isSuccess ? <CheckIcon /> : <SendIcon />)}
                    onClick={fetchNovel}
                    sx={{ px: 3, py: 1, minWidth: '100px' }} // Adjust padding and width
                  >
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
                  <IconButton onClick={handlePlayPause} color="primary" size="large" disabled={isLoading || textArray.length === 0} aria-label={isPlaying ? "Pause" : "Play"}>
                    {isPlaying ? <PauseIcon fontSize="large"/> : <PlayIcon fontSize="large"/>}
                  </IconButton>
                  <IconButton onClick={handleStop} color="secondary" size="large" disabled={isLoading || textArray.length === 0} aria-label="Stop">
                    <StopIcon fontSize="large"/>
                  </IconButton>
                  <Box sx={{ display: 'flex', alignItems: 'center', ml: 2, flexGrow: 1, minWidth: 150 }}>
                    <Tooltip title="Reading Speed">
                      <SpeedIcon color="action" sx={{ mr: 1 }} />
                    </Tooltip>
                    <Slider
                      value={readingRate}
                      min={0.5}
                      max={2.5} // Increased max rate
                      step={0.1}
                      onChange={handleRateChange}
                      aria-labelledby="reading-speed-slider"
                      valueLabelDisplay="auto"
                      valueLabelFormat={(value) => `${value.toFixed(1)}x`}
                      size="small"
                      disabled={isLoading}
                    />
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                 <Typography variant="body2" color="text.secondary" textAlign={{xs: 'left', md: 'right'}} sx={{ mt: { xs: 2, md: 0 } }}>
                   {isLoading ? 'Loading...' : (
                     isPlaying ? `Reading: Paragraph ${currentParaRef.current + 1} / ${textArray.length}`
                               : (textArray.length > 0 ? `Ready (${currentParaRef.current + 1}/${textArray.length})` : 'Load novel to start')
                   )}
                 </Typography>
              </Grid>
            </Grid>
          </Paper>

          {/* Novel Content */}
          <Paper elevation={5} sx={{ p: { xs: 2, md: 4 }, mb: 3, minHeight: '400px', maxHeight: '70vh', overflowY: 'auto' }}>
             <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, borderBottom: 1, borderColor: 'divider', pb: 1 }}>
               <Typography variant="h6" component="h2">
                 Novel Content
               </Typography>
               <Tooltip title={isCopied ? "Copied!" : "Copy text content"}>
                 <span> {/* Span needed for tooltip when button is disabled */}
                   <IconButton onClick={handleCopyToClipboard} disabled={isLoading || novelText.length === 0}>
                     {isCopied ? <CheckIcon color="success" /> : <ContentCopyIcon />}
                   </IconButton>
                 </span>
               </Tooltip>
             </Box>
            <Box
              id="novel-content-area"
              sx={{
                whiteSpace: 'pre-wrap',
                textAlign: 'left',
                color: grey[300],
                fontSize: '1.1rem',
                lineHeight: 1.7,
                '& p': { // Add some margin between paragraphs from the backend
                   marginBottom: '1em',
                },
                '& .highlight': {
                  backgroundColor: 'rgba(66, 165, 245, 0.2)', // Use theme primary color with opacity
                  // backgroundColor: 'rgba(30, 144, 255, 0.2)', // Original color
                  borderRadius: '4px',
                  padding: '2px 4px', // Add slight horizontal padding
                  boxDecorationBreak: 'clone', // Ensure background covers breaks
                  WebkitBoxDecorationBreak: 'clone',
                  // outline: `1px solid ${darkTheme.palette.primary.light}`, // Optional outline
                }
              }}
              dangerouslySetInnerHTML={{ __html: formattedText || "<p>Load a novel using the controls above.</p>" }}
            />
          </Paper>

          <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mt: 4, pb: 2 }}>
            NovAI - Novel Reader App © 2025
          </Typography>
        </Container>
      </Box>
    </ThemeProvider>
  );
};

export default App;