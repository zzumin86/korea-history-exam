import React from 'react';
import {createRoot} from 'react-dom/client';
import {ThemeProvider,createTheme,CssBaseline,AppBar,Toolbar,Container,Box,Typography,Chip} from '@mui/material';
import FamilyDashboard from './FamilyDashboard';

const theme=createTheme({
 palette:{
   mode:'light',
   primary:{main:'#345ac4',dark:'#213e89'},
   secondary:{main:'#27846c'},
   background:{default:'#f6f8fc',paper:'#fff'},
   text:{primary:'#1a2b45',secondary:'#68788e'},
   divider:'#e1e8f1'
 },
 shape:{borderRadius:13},
 typography:{
   fontFamily:'"Noto Sans KR",system-ui,-apple-system,"Malgun Gothic",sans-serif',
   h4:{fontWeight:850,letterSpacing:'-.05em'},
   h5:{fontWeight:800,letterSpacing:'-.035em'},
   h6:{fontWeight:800,letterSpacing:'-.03em'},
   button:{fontWeight:750,textTransform:'none'}
 },
 components:{
   MuiButton:{defaultProps:{disableElevation:true},styleOverrides:{root:{borderRadius:10,minHeight:42}}},
   MuiCard:{styleOverrides:{root:{border:'1px solid #e4eaf2'}}}
 }
});
function App(){
 return <ThemeProvider theme={theme}><CssBaseline/>
   <AppBar position="sticky" color="inherit" elevation={0} sx={{bgcolor:'#fff',borderBottom:'1px solid #e1e8f1'}}>
     <Toolbar sx={{maxWidth:1200,width:'100%',mx:'auto',gap:1.3,minHeight:68}}>
       <Box sx={{width:38,height:38,borderRadius:2,bgcolor:'#193f7a',color:'#fff',display:'grid',placeItems:'center',fontSize:21,fontWeight:900}}>史</Box>
       <Typography sx={{fontWeight:850,fontSize:19,letterSpacing:'-.05em'}}>한능검 공부방</Typography>
       <Box flexGrow={1}/>
       <Chip size="small" variant="outlined" label="가족 전용 학습" sx={{fontWeight:750,color:'#647693'}}/>
     </Toolbar>
   </AppBar>
   <Container maxWidth="lg" sx={{pt:{xs:3,sm:4},pb:9}}>
     <FamilyDashboard/>
   </Container>
   <Box component="footer" sx={{py:3,textAlign:'center',fontSize:11,color:'#8996a9'}}>
     한국사능력검정시험 비공식 가족 학습용 · 문제 원본은 비공개 Storage에서 관리
   </Box>
 </ThemeProvider>;
}
createRoot(document.getElementById('root')).render(<App/>);
