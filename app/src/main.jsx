import React, {useEffect,useMemo,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {ThemeProvider,createTheme,CssBaseline,AppBar,Toolbar,Container,Box,Typography,Button,Paper,Card,CardContent,Grid,Stack,Chip,Alert,LinearProgress,BottomNavigation,BottomNavigationAction,Select,MenuItem,FormControl,InputLabel,Dialog,DialogTitle,DialogContent,DialogActions,IconButton,Divider} from '@mui/material';
import HomeRounded from '@mui/icons-material/HomeRounded';
import AutoStoriesRounded from '@mui/icons-material/AutoStoriesRounded';
import TimerRounded from '@mui/icons-material/TimerRounded';
import HistoryEduRounded from '@mui/icons-material/HistoryEduRounded';
import FactCheckRounded from '@mui/icons-material/FactCheckRounded';
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import HighlightOffRounded from '@mui/icons-material/HighlightOffRounded';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import BookRounded from '@mui/icons-material/BookRounded';
import {questions} from './questions';
import LockOutlined from '@mui/icons-material/LockOutlined';
import FamilyPortal from './FamilyPortal';

const theme=createTheme({
 palette:{primary:{main:'#3158bd',dark:'#193d85'},secondary:{main:'#218476'},background:{default:'#f6f8fc'},text:{primary:'#192b45',secondary:'#687a90'},divider:'#e3e9f2'},
 shape:{borderRadius:14},
 typography:{fontFamily:'"Noto Sans KR",system-ui,-apple-system,sans-serif',h4:{fontWeight:850,letterSpacing:'-.045em'},h5:{fontWeight:800,letterSpacing:'-.04em'},h6:{fontWeight:800,letterSpacing:'-.025em'},button:{textTransform:'none',fontWeight:750}},
 components:{MuiCard:{styleOverrides:{root:{border:'1px solid #e3e9f2',boxShadow:'0 8px 28px #172b4510'}}},MuiButton:{defaultProps:{disableElevation:true},styleOverrides:{root:{borderRadius:10,minHeight:42}}}}
});
const pages=[
 {key:'home',name:'홈',icon:<HomeRounded/>},
 {key:'study',name:'바로 확인',icon:<AutoStoriesRounded/>},
 {key:'test',name:'실전시험',icon:<TimerRounded/>},
 {key:'era',name:'시대별',icon:<HistoryEduRounded/>},
 {key:'wrong',name:'오답 복습',icon:<FactCheckRounded/>},
 {key:'family',name:'가족 기출',icon:<LockOutlined/>}
];
const eras=['전체','선사·고조선','고대','고려','조선','근대','일제강점기','현대'];
const STORAGE='korea-history-demo-v3';
function saved(){
 try {const o=JSON.parse(localStorage.getItem(STORAGE)||'{}');return {attempts:Number(o.attempts)||0,correct:Number(o.correct)||0,missed:o.missed&&typeof o.missed==='object'?o.missed:{}};}
 catch {return {attempts:0,correct:0,missed:{}};}
}
function App(){
 const [page,setPage]=useState(()=>window.location.hash.startsWith('#key=')?'family':'home');
 const [filter,setFilter]=useState('전체');
 const [stats,setStats]=useState(saved);
 const [exam,setExam]=useState(null);
 const [leave,setLeave]=useState(null);
 const [zoom,setZoom]=useState(false);
 useEffect(()=>{try{localStorage.setItem(STORAGE,JSON.stringify(stats));}catch{}},[stats]);
 const missed=useMemo(()=>questions.filter(q=>stats.missed[q.id]),[stats]);

 function start(mode,selected='전체'){
  const list=questions.filter(q=>selected==='전체'||q.era===selected);
  if(!list.length)return;
  setExam({mode,list,index:0,answers:{},done:false});
  setPage(mode==='test'?'test':mode==='era'?'era':'study');
  window.scrollTo(0,0);
 }
 function goto(target){
  if(exam&&!exam.done&&target!==page){setLeave(target);return;}
  setExam(null);setPage(target);window.scrollTo(0,0);
 }
 function choice(q,n){if(!exam||exam.done||(exam.mode!=='test'&&exam.answers[q.id]))return;setExam(s=>({...s,answers:{...s.answers,[q.id]:n}}));}
 function finish(){
  if(!exam||exam.done||exam.list.some(q=>!exam.answers[q.id]))return;
  const count=exam.list.filter(q=>exam.answers[q.id]===q.answer).length;
  setStats(s=>{
   const wrong={...s.missed};
   exam.list.forEach(q=>{if(exam.answers[q.id]===q.answer)delete wrong[q.id];else wrong[q.id]=true;});
   return {attempts:s.attempts+1,correct:s.correct+count,missed:wrong};
  });
  setExam(s=>({...s,done:true}));
 }
 const heading=(title,subtitle)=> <Box sx={{mb:3}}><Typography variant="h5">{title}</Typography>{subtitle&&<Typography color="text.secondary" sx={{mt:.65,fontSize:13}}>{subtitle}</Typography>}</Box>;
 const menuCard=(icon,title,desc,color,onClick)=> <Grid size={{xs:12,sm:6,lg:3}} key={title}><Card sx={{height:'100%',borderRadius:3}}><CardContent sx={{p:2.7,'&:last-child':{pb:2.7},height:'100%',display:'flex',flexDirection:'column'}}>
  <Box sx={{width:48,height:48,borderRadius:2.3,display:'grid',placeItems:'center',bgcolor:color+'16',color,mb:2}}>{icon}</Box>
  <Typography variant="h6">{title}</Typography><Typography sx={{fontSize:13,lineHeight:1.75,color:'text.secondary',mt:1,flexGrow:1,minHeight:76}}>{desc}</Typography>
  <Button variant="outlined" endIcon={<ArrowForwardRounded/>} onClick={onClick} sx={{alignSelf:'start',mt:1.8}}>시작하기</Button>
 </CardContent></Card></Grid>;
 function home(){
  return <Stack spacing={3}>
   <Paper elevation={0} sx={{borderRadius:4,overflow:'hidden',position:'relative',px:{xs:3,md:5},py:{xs:4,md:5.5},background:'linear-gradient(115deg,#142c50,#234a82 75%,#2f649d)',color:'#fff'}}>
    <Box sx={{position:'absolute',width:330,height:330,border:'1px solid #ffffff30',borderRadius:'50%',right:-100,top:-145,boxShadow:'0 0 0 60px #ffffff0b,0 0 0 125px #ffffff07',pointerEvents:'none'}}/>
    <Chip label="KOREAN HISTORY EXAM" sx={{bgcolor:'#ffffff22',color:'#fff',border:'1px solid #ffffff45',fontWeight:750,fontSize:11}}/>
    <Typography variant="h4" sx={{mt:2.3,fontSize:{xs:30,sm:40},lineHeight:1.3,maxWidth:620}}>한국사, 하루 한 문제부터.<br/>차근차근 실력을 쌓아요.</Typography>
    <Typography sx={{mt:1.5,maxWidth:600,color:'#d5e3f6',lineHeight:1.8,fontSize:{xs:13,sm:15}}}>문제별 바로 정답 확인부터 실전 연습까지. 현재는 자체 제작 맛보기 문제 5개로 학습 흐름을 체험할 수 있어요.</Typography>
    <Stack direction={{xs:'column',sm:'row'}} gap={1.2} sx={{mt:3.2,alignItems:{sm:'start'}}}>
     <Button variant="contained" sx={{bgcolor:'#fff',color:'#17335b','&:hover':{bgcolor:'#f2f6fd'}}} endIcon={<ArrowForwardRounded/>} onClick={()=>start('study')}>바로 공부 시작</Button>
     <Button variant="outlined" sx={{color:'#fff',borderColor:'#ffffff74'}} onClick={()=>goto('test')}>실전 모드 보기</Button>
    </Stack>
   </Paper>
   <Box>{heading('학습 방식 선택','원하는 방식으로 학습해 보세요.')}
    <Grid container spacing={2}>
     {menuCard(<AutoStoriesRounded/>,'바로 정답 확인','한 문제를 풀면 즉시 정답과 해설이 나오는 학습 모드','#3158bd',()=>start('study'))}
     {menuCard(<TimerRounded/>,'실전시험 모드','풀 때는 정답을 숨기고 제출한 다음 결과를 확인하는 방식','#b97335',()=>goto('test'))}
     {menuCard(<HistoryEduRounded/>,'시대별 학습','선사·고대·고려·조선 등 특정 시대의 문제만 골라서 풀기','#7653ac',()=>goto('era'))}
     {menuCard(<FactCheckRounded/>,'오답 복습','틀린 문제를 다시 보며 반복 학습하고 실력을 점검하기','#208777',()=>goto('wrong'))}
    </Grid>
   </Box>
   <Grid container spacing={2}>
    <Grid size={{xs:12,md:7}}><Card><CardContent sx={{p:3,'&:last-child':{pb:3}}}><Typography variant="h6">나의 학습 기록</Typography><Typography color="text.secondary" fontSize={12} sx={{mt:.5}}>이 브라우저에만 임시 저장 · 계정 동기화 준비 중</Typography><Grid container spacing={1.5} sx={{mt:1}}>
    {[[stats.attempts,'완료한 연습'],[stats.correct,'맞힌 문제 누계'],[missed.length,'오답 문항']].map(([value,label])=><Grid size={4} key={label}><Box sx={{textAlign:'center',bgcolor:'#f4f7fb',p:2,borderRadius:2}}><Typography variant="h5" color="primary.dark">{value}</Typography><Typography color="text.secondary" fontSize={12}>{label}</Typography></Box></Grid>)}
    </Grid></CardContent></Card></Grid>
    <Grid size={{xs:12,md:5}}><Card sx={{height:'100%'}}><CardContent sx={{p:3,'&:last-child':{pb:3}}}><Typography variant="h6">기출자료 준비 중</Typography><Typography color="text.secondary" fontSize={13} sx={{my:1.3,lineHeight:1.8}}>73~80회 심화 원본을 확보했어요. 문제 이미지 재게시 가능 범위와 문항별 검증을 마친 뒤 순차 연결합니다.</Typography><Alert severity="info" sx={{fontSize:12}}>현재 문제는 공식 기출이 아닌 자체 제작 예시입니다.</Alert></CardContent></Card></Grid>
   </Grid>
  </Stack>;
 }
 function result(){
  const hits=exam.list.filter(q=>exam.answers[q.id]===q.answer);
  return <Box sx={{maxWidth:850,mx:'auto'}}><Card><CardContent sx={{p:{xs:2.5,sm:4},'&:last-child':{pb:4}}}>
    <Chip color="primary" label="연습 완료"/><Typography variant="h5" sx={{mt:2}}>풀이 결과</Typography>
    <Typography sx={{fontSize:44,fontWeight:850,color:'primary.dark',mt:1}}>{hits.length} / {exam.list.length}</Typography>
    <Typography color="text.secondary" fontSize={13}>실제 시험 성적과 무관한 맛보기 결과입니다.</Typography><Divider sx={{my:3}}/>
    <Stack spacing={1.4}>{exam.list.map((q,i)=>{const good=exam.answers[q.id]===q.answer;return <Paper key={q.id} variant="outlined" sx={{p:2,borderLeft:'4px solid '+(good?'#329b83':'#d56969')}}><Stack direction="row" gap={1} alignItems="center" sx={{mb:.6}}>{good?<CheckCircleRounded color="success"/>:<HighlightOffRounded color="error"/>}<Typography fontWeight={750}>{i+1}. {q.title}</Typography></Stack><Typography fontSize={13}>정답: {q.options[q.answer-1]}</Typography><Typography fontSize={13} color="text.secondary" sx={{mt:.6}}>{q.explain}</Typography></Paper>;})}</Stack>
    <Stack direction="row" gap={1.3} sx={{mt:3}}><Button variant="contained" onClick={()=>start(exam.mode)}>다시 풀기</Button><Button variant="outlined" onClick={()=>goto('home')}>홈으로</Button></Stack>
   </CardContent></Card></Box>;
 }
 function quiz(){
  if(exam.done)return result();
  const q=exam.list[exam.index],selected=exam.answers[q.id];
  const checked=Boolean(selected)&&exam.mode!=='test';
  const count=Object.keys(exam.answers).length;
  return <Box sx={{maxWidth:1050,mx:'auto'}}>
   <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{mb:2}} gap={1}>
    <Box><Typography fontSize={12} color="text.secondary">자체 제작 연습문제</Typography><Typography variant="h5">{exam.mode==='test'?'실전 모드 체험':exam.mode==='era'?'시대별 공부':'바로 정답 확인'} <Chip size="small" label="예시 5문항" sx={{ml:1}}/></Typography></Box>
    <Button variant="outlined" size="small" onClick={()=>setLeave('home')}>나가기</Button>
   </Stack>
   <Grid container spacing={2}><Grid size={{xs:12,md:8}}><Card><CardContent sx={{p:{xs:2.3,sm:3.5},'&:last-child':{pb:{xs:2.3,sm:3.5}}}}>
    <Stack direction="row" justifyContent="space-between" alignItems="center"><Chip size="small" color="primary" label={'문제 '+(exam.index+1)+' / '+exam.list.length}/><Typography fontSize={12} color="text.secondary">{count}문항 선택</Typography></Stack>
    <LinearProgress variant="determinate" value={(exam.index+1)/exam.list.length*100} sx={{mt:1.5,mb:3,height:6,borderRadius:3,bgcolor:'#e9eef6'}}/>
    <Typography sx={{fontSize:{xs:19,md:22},lineHeight:1.6,fontWeight:800,mb:3}}>{q.title}</Typography>
    {q.image&&<Box sx={{mb:2.5,position:'relative',textAlign:'center'}}><Box component="img" src={import.meta.env.BASE_URL+q.image} alt="문제 원문" sx={{maxWidth:'100%',height:'auto',cursor:'zoom-in'}} onClick={()=>setZoom(true)}/><Button size="small" onClick={()=>setZoom(true)}>이미지 확대</Button></Box>}
    <Stack spacing={1.15}>{q.options.map((option,i)=>{const v=i+1,chosen=selected===v,right=checked&&v===q.answer,wrong=checked&&chosen&&!right;return <Button key={v} fullWidth variant="outlined" disabled={checked} onClick={()=>choice(q,v)} sx={{justifyContent:'start',textAlign:'left',px:2,py:1.45,minHeight:56,color:right?'#21795d':wrong?'#bd4e49':chosen?'primary.dark':'text.primary',bgcolor:right?'#eefbf3':wrong?'#fff2f2':chosen?'#eef3ff':'white',borderColor:right?'#2da277':wrong?'#df8787':chosen?'#3158bd':'#dae2ed','&.Mui-disabled':{opacity:1,color:right?'#21795d':wrong?'#bd4e49':'text.secondary',borderColor:right?'#2da277':wrong?'#df8787':'#dae2ed'}}}><Box sx={{width:28,height:28,borderRadius:'50%',bgcolor:chosen?'#3158bd':'#edf1f7',color:chosen?'white':'#62758f',display:'grid',placeItems:'center',mr:1.6,flexShrink:0,fontWeight:800}}>{v}</Box>{option}{right&&<CheckCircleRounded sx={{ml:'auto',color:'success.main'}}/>}{wrong&&<HighlightOffRounded sx={{ml:'auto',color:'error.main'}}/>}</Button>;})}</Stack>
    {checked&&<Alert severity={selected===q.answer?'success':'error'} sx={{mt:2.5}}><Typography fontWeight={800} fontSize={13}>{selected===q.answer?'정답이에요!':'아쉬워요. 정답을 확인해 보세요.'}</Typography><Typography fontSize={13} sx={{mt:.3}}>{q.explain}</Typography></Alert>}
    <Stack direction="row" justifyContent="space-between" sx={{mt:3}} gap={1}>
     <Button variant="outlined" disabled={exam.index===0} startIcon={<ArrowBackRounded/>} onClick={()=>setExam(s=>({...s,index:s.index-1}))}>이전</Button>
     {exam.index===exam.list.length-1?<Button variant="contained" disabled={count!==exam.list.length} onClick={finish}>제출하고 결과 보기</Button>:<Button variant="contained" disabled={!selected} endIcon={<ArrowForwardRounded/>} onClick={()=>setExam(s=>({...s,index:s.index+1}))}>다음 문제</Button>}
    </Stack>
   </CardContent></Card></Grid>
   <Grid size={{xs:12,md:4}}><Card sx={{position:{md:'sticky'},top:{md:90}}}><CardContent sx={{p:2.6,'&:last-child':{pb:2.6}}}><Typography variant="h6">답안 현황</Typography><Typography fontSize={12} color="text.secondary" sx={{my:1}}>{count} / {exam.list.length}문항 선택</Typography><LinearProgress variant="determinate" value={count/exam.list.length*100} sx={{height:6,borderRadius:3,mb:2}}/><Box sx={{display:'grid',gridTemplateColumns:'repeat(5,minmax(0,1fr))',gap:1}}>{exam.list.map((item,i)=><Button key={item.id} variant={i===exam.index?'contained':'outlined'} sx={{p:0,minWidth:0,bgcolor:i!==exam.index&&exam.answers[item.id]?'#eef3ff':undefined}} onClick={()=>setExam(s=>({...s,index:i}))}>{i+1}</Button>)}</Box><Alert severity="info" icon={false} sx={{mt:2.3,fontSize:12}}>본 화면은 정식 50문항 시험이 아닌 학습 기능 체험판입니다.</Alert></CardContent></Card></Grid>
   </Grid>
  </Box>;
 }
 function view(){
  if(page==='family')return <FamilyPortal/>;
  if(exam)return quiz();
  if(page==='home')return home();
  if(page==='study')return <Box sx={{maxWidth:770,mx:'auto'}}>{heading('바로 정답 확인','한 문제씩 풀고 즉시 정답과 해설을 확인하는 방식입니다.')}<Card><CardContent sx={{p:3,'&:last-child':{pb:3}}}><Stack direction="row" gap={1} sx={{mb:2}}><Chip label="맛보기 5문항"/><Chip label="즉시 해설" variant="outlined"/></Stack><Typography variant="h6" sx={{mb:1}}>공부 모드</Typography><Typography fontSize={13} color="text.secondary" sx={{mb:3}}>한 문제의 답을 선택하면 바로 정답과 해설이 표시됩니다. 현재는 자체 제작 예시 문제로만 제공돼요.</Typography><Button variant="contained" onClick={()=>start('study')}>공부 시작</Button></CardContent></Card></Box>;
  if(page==='era')return <Box sx={{maxWidth:770,mx:'auto'}}>{heading('시대별 학습','학습할 시대를 골라 연습할 수 있습니다. 공식 기출 분류는 추가 검증 중입니다.')}<Card><CardContent sx={{p:3,'&:last-child':{pb:3}}}><FormControl fullWidth><InputLabel id="era-select">시대 선택</InputLabel><Select labelId="era-select" label="시대 선택" value={filter} onChange={e=>setFilter(e.target.value)}>{eras.map(era=><MenuItem key={era} value={era}>{era}</MenuItem>)}</Select></FormControl><Typography sx={{my:2,color:'text.secondary',fontSize:13}}>현재 체험 가능한 문제: {questions.filter(q=>filter==='전체'||q.era===filter).length}개</Typography><Button variant="contained" disabled={!questions.some(q=>filter==='전체'||q.era===filter)} onClick={()=>start('era',filter)}>선택한 시대 공부하기</Button></CardContent></Card></Box>;
  if(page==='wrong')return <Box sx={{maxWidth:880,mx:'auto'}}>{heading('오답 복습','현재 브라우저에 저장된 연습 문제 기록입니다.')}{missed.length?<Stack spacing={1.2}>{missed.map(q=><Paper variant="outlined" key={q.id} sx={{p:2.5,borderRadius:3}}><Chip size="small" label={q.era} sx={{mb:1}}/><Typography fontWeight={800}>{q.title}</Typography><Typography fontSize={13} sx={{mt:.8}}>정답: {q.options[q.answer-1]}</Typography><Typography color="text.secondary" fontSize={13} sx={{mt:.4}}>{q.explain}</Typography></Paper>)}<Button variant="outlined" onClick={()=>start('study')}>전체 연습 다시 풀기</Button></Stack>:<Paper variant="outlined" sx={{p:5,textAlign:'center'}}><FactCheckRounded sx={{fontSize:42,color:'#96a6bf'}}/><Typography variant="h6" sx={{mt:1}}>아직 오답이 없어요</Typography><Typography fontSize={13} color="text.secondary" sx={{my:2}}>문제를 푼 뒤 틀린 문항이 여기에 나타납니다.</Typography><Button variant="contained" onClick={()=>start('study')}>연습 시작하기</Button></Paper>}</Box>;
  return <Box sx={{maxWidth:770,mx:'auto'}}>{heading('실전시험 모드','원래 한능검 심화는 50문항이지만, 현재는 자체 제작 5문항으로 시험 흐름만 체험할 수 있어요.')}<Card><CardContent sx={{p:3,'&:last-child':{pb:3}}}><Stack direction="row" gap={1} sx={{mb:2}}><Chip label="맛보기 5문항"/><Chip variant="outlined" label="제출 후 정답 공개"/></Stack><Typography variant="h6" sx={{mb:1}}>모의시험 체험</Typography><Typography fontSize={13} color="text.secondary" sx={{mb:3}}>답을 선택해도 정답을 보여주지 않고, 모두 제출한 후에 결과를 확인합니다.</Typography><Button variant="contained" onClick={()=>start('test')}>시험 체험 시작</Button></CardContent></Card></Box>;
 }
 return <ThemeProvider theme={theme}><CssBaseline/>
  <AppBar position="sticky" elevation={0} color="inherit" sx={{borderBottom:'1px solid #e3e9f2',bgcolor:'#fff'}}><Toolbar sx={{maxWidth:1250,width:'100%',mx:'auto',height:67,px:{xs:2,md:3},gap:1.5}}>
    <Box sx={{width:37,height:37,borderRadius:2,background:'#173966',color:'#fff',display:'grid',placeItems:'center',fontSize:22,fontWeight:900}}>史</Box>
    <Typography fontSize={20} fontWeight={850} letterSpacing="-.05em">한능검 공부방</Typography>
    <Chip size="small" label="BETA" sx={{bgcolor:'#ebf1ff',color:'#3158bd',fontWeight:800,display:{xs:'none',sm:'inline-flex'}}}/>
    <Box flexGrow={1}/><Stack direction="row" gap={.2} sx={{display:{xs:'none',md:'flex'}}}>{pages.map(p=><Button key={p.key} onClick={()=>goto(p.key)} sx={{bgcolor:page===p.key?'#edf3ff':'transparent',color:page===p.key?'#3158bd':'#778599'}}>{p.name}</Button>)}</Stack>
    <Chip size="small" variant="outlined" label="가족별 전용 링크" sx={{display:{xs:'none',sm:'inline-flex'},color:'text.secondary'}}/>
  </Toolbar></AppBar>
  <Container maxWidth="lg" sx={{py:{xs:2,md:4},pb:{xs:13,md:6}}}>{view()}</Container>
  <Box sx={{textAlign:'center',fontSize:12,color:'#98a5b6',pb:4,display:{xs:'none',md:'block'}}}>한국사능력검정시험 비공식 학습 앱 · 공식 기출 미수록</Box>
  <Paper elevation={4} sx={{position:'fixed',bottom:0,left:0,right:0,zIndex:20,display:{xs:'block',md:'none'},borderTop:'1px solid #e3e9f2',pb:'env(safe-area-inset-bottom)'}}><BottomNavigation value={page} showLabels onChange={(_,v)=>goto(v)} sx={{height:64}}>{pages.map(p=><BottomNavigationAction key={p.key} value={p.key} label={p.name} icon={p.icon} sx={{minWidth:0,p:0,'& .MuiBottomNavigationAction-label':{fontSize:'10px!important'}}}/>)}</BottomNavigation></Paper>
  <Dialog open={Boolean(leave)} onClose={()=>setLeave(null)}><DialogTitle>학습을 종료할까요?</DialogTitle><DialogContent><Typography fontSize={14}>진행 중인 답안은 저장되지 않습니다.</Typography></DialogContent><DialogActions><Button onClick={()=>setLeave(null)}>계속 풀기</Button><Button color="error" onClick={()=>{const next=leave;setLeave(null);setExam(null);setPage(next);window.scrollTo(0,0);}}>종료</Button></DialogActions></Dialog>
  <Dialog open={zoom} onClose={()=>setZoom(false)} maxWidth="md" fullWidth><DialogTitle>문제 이미지 확대</DialogTitle><DialogContent>{exam?.list[exam.index]?.image&&<Box component="img" src={import.meta.env.BASE_URL+exam.list[exam.index].image} alt="확대한 문제 이미지" sx={{maxWidth:'100%'}}/>}</DialogContent><DialogActions><Button onClick={()=>setZoom(false)}>닫기</Button></DialogActions></Dialog>
 </ThemeProvider>;
}
createRoot(document.getElementById('root')).render(<App/>);
