import './App.css';
import { useState, useEffect, useRef } from 'react';
import { TextField, Button, Tooltip, CssBaseline, Fab, CircularProgress } from '@mui/material';
import { Send as SendIcon, ContentCopy as ContentCopyIcon, Check as CheckIcon, Save as SaveIcon } from '@mui/icons-material';
import { Box } from '@mui/system';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { green } from '@mui/material/colors';

const App = () => {
  const [keyword, setKeyword] = useState('infinite mana in the apocalypse');
  const [chapter, setChapter] = useState(1);
  const [number, setNumber] = useState(1);
  const [url, setUrl] = useState('');
  const [novelText, setNovelText] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const timerRef = useRef();

  const buttonStyle = {
    ...(isSuccess ? {
      bgcolor: green[500],
      '&:hover': { bgcolor: green[700] },
    }: {color:'inherit'}),
  };

  const fabStyle = {
    ...(isSuccess ? {
      bgcolor: green[500],
      '&:hover': { bgcolor: green[700] },
    }: {color:'white'}),
  };

  useEffect(() => {
    return () => clearTimeout(timerRef.current);
  }, []);

  const handleFetch = (keyword, chapter, number) => {
    if (!isLoading) {
      setIsSuccess(false);
      setIsLoading(true);

      fetch('http://127.0.0.1:5000/kherya/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        mode: 'cors',
        body: JSON.stringify({ keyword, chapter, number }),
      })
        .then(response => response.json())
        .then(result => {
          setUrl(result.url);
          setNovelText(result.text);
          saveTextToFile(result.text);
          setIsSuccess(true);
          setIsLoading(false);
        });
    }
  };

  const darkTheme = createTheme({
    palette: {
      mode: 'dark',
      primary: { main: 'rgba(255, 255, 255, 0.08)' },
    },
  });

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(novelText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const saveTextToFile = text => {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${keyword}_${chapter}_${number}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // useEffect(() => {
  //   const script = document.createElement('script');
  //   script.src = 'https://unpkg.com/ttsreader-plugin/main.js';
  //   script.defer = true;

  //   // Run when the script has loaded successfully
  //   script.onload = () => {
  //     console.log('TTSReader Plugin script loaded.');

  //     // Initialize the plugin (if it provides an API for initialization)
  //     if (window.TTSReaderPlugin) {
  //       window.TTSReaderPlugin.init({
  //         elementId: 'tts-reader-container',
  //         format: "large" // The container where the plugin will render
  //       });
  //     }
  //   };

  //   // Error handling
  //   script.onerror = () => {
  //     console.error('Failed to load the TTSReader Plugin script.');
  //   };

  //   // Append the script to the document
  //   document.body.appendChild(script);

  //   // Clean up the script when the component unmounts
  //   return () => {
  //     document.body.removeChild(script);
  //   };
  // }, []); // Empty dependency array ensures this runs only once when the component mounts


  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Box
        sx={{
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%', // Make it full screen
          textAlign: 'center', // Optional, for text alignment
        }}
      > 
        <div style={{ width: '100%', alignItems: 'center' }}>
        <img src="try.png" alt="Logo" style={{ width: '100%', height: '300px' }} />
        <br />
        <br />
          <TextField
            label="Keyword"
            variant="outlined"
            style={{ width: '40%', margin: '5px' }}
            inputProps={{ style: { color: '#94999D' } }}
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
          />
          <TextField
            label="Chapter"
            type="number"
            variant="outlined"
            style={{ width: '5%', margin: '5px' }}
            inputProps={{ style: { color: '#94999D' } }}
            value={chapter}
            onChange={e => setChapter(e.target.value)}
          />
          <TextField
            label="Number"
            type="number"
            variant="outlined"
            style={{ width: '5%', margin: '5px' }}
            inputProps={{ style: { color: '#94999D' } }}
            value={number}
            onChange={e => setNumber(e.target.value)}
          />
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Box sx={{ m: 1, position: 'relative' }}>
              <Fab
                aria-label="save"
                color='primary'
                sx={fabStyle}
                onClick={() => handleFetch(keyword, chapter, number)}
              >
                {isSuccess ? <CheckIcon /> : <SaveIcon />}
              </Fab>
              {isLoading && (
                <CircularProgress
                  size={68}
                  sx={{
                    color: green[500],
                    position: 'absolute',
                    top: -6,
                    left: -6,
                    zIndex: 1,
                  }}
                />
              )}
            </Box>
            <Box sx={{ m: 1, position: 'relative' }}>
              <Button
                variant="contained"
                sx={buttonStyle}
                disabled={isLoading}
                onClick={() => handleFetch(keyword, chapter, number)}
              >
                Send
              </Button>
              {isLoading && (
                <CircularProgress
                  size={24}
                  sx={{
                    color: green[500],
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    marginTop: '-12px',
                    marginLeft: '-12px',
                  }}
                />
              )}
            </Box>
          </Box>
          <br />
          <br />
          <TextField
            style={{ width: '50%' }}
            label="Url"
            variant="outlined"
            inputProps={{ style: { color: '#94999D' } }}
            value={url}
          />
          <br />
          <br />
          <TextField
            multiline
            style={{ width: '80%' }}
            label="Novel"
            inputProps={{ style: { color: '#94999D' } }}
            variant="outlined"
            value={novelText}
          />
          <Tooltip title="Copy to clipboard">
            <Button onClick={handleCopyToClipboard} sx={{ minWidth: '30px' }}>
              <ContentCopyIcon sx={{ height: '20px', color: '#216C17' }} />
            </Button>
          </Tooltip>
        </div>
      </Box>
    </ThemeProvider>
  );
};

export default App;

