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
  const [novelText, setNovelText] = useState('\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n');
  const [isCopied, setIsCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const timerRef = useRef();
  const [shouldSpeak, setShouldSpeak] = useState(false);
  const [title, setTitle] = useState('Novel Title');
  const [image, setImage] = useState('./logo192.png');

  const tts = window.wsGlobals.TtsEngine;


  const backgroundStyle = {
    backgroundImage: "url('background.png')",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundAttachment: "fixed",
    height: "100%",
    width: "100%",
    backgroundRepeat: "no-repeat",
  };



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
    if (window.wsGlobals) {
      const tts = window.wsGlobals.TtsEngine;

      // Initialize the TTS Engine
      tts.init({
          onInit: (voices) => {
              console.log("TTS initialized with voices:", voices);
          },
          onStart: () => {
              console.log("Speech started");
          },
          onDone: () => {
              console.log("Speech completed");
          },
      });
  } else {
      console.error("wsGlobals is not defined.");
  }
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
          const data = "<p>" + result.text.split('\n').map(line => line.trim()).join('</p><p>') + '</p>';
          setNovelText(data);
          // setNovelText(result.text);
          saveTextToFile(result.text);
          setTitle(result.title);
          setImage(result.image);
          setIsSuccess(true);
          setIsLoading(false);
          tts.setRate(20);
          tts.setVoiceByUri("urn:moz-tts:sapi:Microsoft Zira Desktop - English (United States)?en-US");
          // tts.speakOut(result.text);
          // setShouldSpeak(true);
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


  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Box style={backgroundStyle}
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
        <div class="container">
          <div class="image">
            <img src={image} alt="placeholder" />
          </div>
          <div class="text">
            <h1>{title}</h1>
          </div>
        </div>      

          <TextField
            label="Keyword"
            variant="outlined"
            style={{ width: '40%', margin: '5px', backgroundColor:'rgba(31,31,31,0.95)'}}
            inputProps={{ style: { color: '#94999D' } }}
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
          />
          <TextField
            label="Chapter"
            type="number"
            variant="outlined"
            style={{ width: '7%', margin: '5px', backgroundColor:'rgba(31,31,31,0.95)'}}
            inputProps={{ style: { color: '#94999D' } }}
            value={chapter}
            onChange={e => setChapter(e.target.value)}
          />
          <TextField
            label="Number"
            type="number"
            variant="outlined"
            style={{ width: '7%', margin: '5px', backgroundColor:'rgba(31,31,31,0.95)' }}
            inputProps={{ style: { color: '#94999D' } }}
            value={number}
            onChange={e => setNumber(e.target.value)}
          />
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Box sx={{ m: 1, position: 'relative' }}>
              <Fab
                aria-label="save"
                color='primary'
                style={{backgroundColor:'rgba(31,31,31,0.95)' }}
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
                style={{backgroundColor:'rgba(31,31,31,0.95)' }}
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
          <Button style={{backgroundColor:'rgba(31,31,31,0.95)' }} onClick={() => {setShouldSpeak(!shouldSpeak); !shouldSpeak ? tts.speakOut(novelText) : tts.stop();}} color ="inherit">{!shouldSpeak ? "Play" : "Stop"}</Button>
          <br />
          <br />
          <TextField
            style={{ width: '50%', backgroundColor:'rgba(31,31,31,0.95)' }}
            label="Url"
            variant="outlined"
            inputProps={{ style: { color: '#94999D' } }}
            value={url}
          />
          <br />
          <br />
          {/* <TextField
            multiline
            style={{ width: '80%', backgroundColor:'rgba(31,31,31,0.95)' }}
            label="Novel"
            inputProps={{ style: { color: '#94999D' } }}
            variant="outlined"
            value={novelText}
          /> */}
          <div style={{ width: '100%', justifyContent: 'center' }}>
          <div
            style={{
              width: '80%',
              backgroundColor: 'rgba(31,31,31,0.95)',
              padding: '1rem',
              borderRadius: '4px',
              color: '#94999D',
              margin: '0 auto'
            }}
          >
            <label style={{ display: 'block', marginBottom: '8px', color: '#94999D', textAlign: 'center' }}>Novel</label>
            <div
              style={{ whiteSpace: 'pre-wrap', textAlign: 'left', }}
              dangerouslySetInnerHTML={{ __html: novelText }}
            />
          </div>
          </div>
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

