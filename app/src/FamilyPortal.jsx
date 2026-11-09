import React, {useEffect,useMemo,useState} from 'react';
import {Box,Button,Typography,Card,CardContent,Stack,Chip,Alert,Grid,
 Paper,LinearProgress,TextField,IconButton,Dialog,DialogTitle,DialogContent,DialogActions,
 Divider,CircularProgress,Select,MenuItem} from '@mui/material';
import LockOutlined from '@mui/icons-material/LockOutlined';
import ContentCopyRounded from '@mui/icons-material/ContentCopyRounded';
import UploadFileRounded from '@mui/icons-material/UploadFileRounded';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import ZoomInRounded from '@mui/icons-material/ZoomInRounded';
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import {unzipSync} from 'fflate';
import {familyApi,supabase,KHE_BUCKET} from './kheSupabase';

const STORAGE='khe-private-link-v1';
const ROUNDS=[80,79,78,77,76,75,74,73];
const ALLOWED_IMAGE=/^round(7[3-9]|80)\/images\/q([0-4][0-9]|50)\.webp$/;
function getToken(){
  const fragment=window.location.hash.match(/^#key=([a-f0-9]{64})$/i);
  if(fragment){
    localStorage.setItem(STORAGE,fragment[1].toLowerCase());
    history.replaceState(null,'',window.location.pathname+window.location.search);
    return fragment[1].toLowerCase();
  }
  return localStorage.getItem(STORAGE)||'';
}
function validate(manifest,round,entries){
  if(!manifest||manifest.round!==round||manifest.level!=='advanced'||manifest.total_questions!==50||manifest.total_points!==100||!Array.isArray(manifest.questions)||manifest.questions.length!==50)throw Error('정답 목록 형식이나 문항 수가 맞지 않습니다.');
  let sum=0;const ids=new Set();
  for(const q of manifest.questions){
    if(!Number.isInteger(q.number)||q.number<1||q.number>50||ids.has(q.number))throw Error('문항 번호 누락 또는 중복');
    if(!Number.isInteger(q.answer)||q.answer<1||q.answer>5||!Number.isInteger(q.points)||q.points<1||q.points>3)throw Error('정답 또는 배점 오류');
    const expected='round'+round+'/images/q'+String(q.number).padStart(2,'0')+'.webp';
    if(q.image!==expected||!ALLOWED_IMAGE.test(q.image)||!entries[q.image]?.byteLength)throw Error(q.number+'번 문제 이미지 없음');
    ids.add(q.number);sum+=q.points;
  }
  if(sum!==100)throw Error('배점 총합이 100점이 아닙니다.');
}
function LabelBox({title,children}){return <Box sx={{mb:2}}><Typography fontWeight={800} mb={1}>{title}</Typography>{children}</Box>}
export default function FamilyPortal(){
 const [token,setToken]=useState(getToken);
 const [member,setMember]=useState(null);
 const [checking,setChecking]=useState(Boolean(token));
 const [error,setError]=useState('');
 const [round,setRound]=useState(80);
 const [catalog,setCatalog]=useState(null);
 const [loading,setLoading]=useState(false);
 const [mode,setMode]=useState(null);
 const [pos,setPos]=useState(0);
 const [answers,setAnswers]=useState({});
 const [feedback,setFeedback]=useState({});
 const [imageUrl,setImageUrl]=useState('');
 const [imageBusy,setImageBusy]=useState(false);
 const [zoom,setZoom]=useState(false);
 const [records,setRecords]=useState([]);
 const [nickname,setNickname]=useState('');
 const [members,setMembers]=useState([]);
 const [newLink,setNewLink]=useState('');
 const [zipBusy,setZipBusy]=useState(false);
 const [zipMessage,setZipMessage]=useState('');
 const [sourceZip,setSourceZip]=useState(null);
 const [showAdmin,setShowAdmin]=useState(false);

 useEffect(()=>{
   let active=true;
   if(!token){setChecking(false);setMember(null);return;}
   setChecking(true);setError('');
   familyApi('status',token).then(data=>{if(active){setMember(data);setChecking(false)}})
     .catch(err=>{if(active){setError('이 링크를 확인할 수 없습니다. 링크가 만료되거나 폐기됐을 수 있어요.');setMember(null);setChecking(false)}});
   return ()=>{active=false};
 },[token]);

 async function selectRound(value){
   setRound(value);setMode(null);setPos(0);setAnswers({});setFeedback({});setCatalog(null);
   setLoading(true);setError('');
   try{setCatalog(await familyApi('round',token,{round:value}));}
   catch(err){setError(err.message==='round_not_uploaded'?'이 회차는 아직 준비 중입니다.':err.message);}
   finally{setLoading(false);}
 }
 useEffect(()=>{if(member)selectRound(80);},[member?.memberId]);

 useEffect(()=>{
   if(!member)return;
   familyApi('records',token).then(x=>setRecords(x.records||[])).catch(()=>{});
 },[member?.memberId]);

 const current=mode&&catalog?catalog.questions[pos]:null;
 useEffect(()=>{
   let active=true;
   setImageUrl('');setImageBusy(Boolean(current));
   if(current)familyApi('question',token,{round,number:current.number})
     .then(data=>{if(active){setImageUrl(data.url);setImageBusy(false)}})
     .catch(err=>{if(active){setImageBusy(false);setError('이미지를 불러오지 못했습니다: '+err.message)}});
   return ()=>{active=false};
 },[token,round,current?.number]);

 function clearLink(){
   localStorage.removeItem(STORAGE);
   setToken('');setMember(null);setMode(null);setCatalog(null);setError('');
 }
 function start(m){setMode(m);setPos(0);setAnswers({});setFeedback({});setError('');}
 async function selectAnswer(n){
   if(!current||loading||(mode!=='test' && answers[current.id]))return;
   setLoading(true);setError('');
   try{
     const data=await familyApi('save_answer',token,{round,number:current.number,selected:n,mode});
     setAnswers(s=>({...s,[current.id]:n}));
     if(mode!=='test')setFeedback(s=>({...s,[current.id]:data}));
     // updated records remain private to this link owner.
   }catch(err){setError('답안 저장 실패: '+err.message)}
   finally{setLoading(false);}
 }
 async function refreshMembers(){
   try{const x=await familyApi('members',token);setMembers(x.members||[])}
   catch(err){setError(err.message)}
 }
 async function createMember(){
   if(!nickname.trim())return;
   setLoading(true);setError('');setNewLink('');
   try{
     const data=await familyApi('create_member',token,{nickname:nickname.trim()});
     const url=window.location.origin+import.meta.env.BASE_URL+'#key='+data.token;
     setNewLink(url);setNickname('');await refreshMembers();
   }catch(err){setError('가족 링크 발급 실패: '+err.message)}
   finally{setLoading(false);}
 }
 async function revokeMember(id){
   if(!window.confirm('이 링크를 폐기할까요? 해당 링크로는 다시 접속할 수 없어요.'))return;
   try{await familyApi('revoke_member',token,{memberId:id});await refreshMembers();}
   catch(err){setError('폐기 실패: '+err.message);}
 }
 async function uploadZip(){
   if(!sourceZip)return;
   if(sourceZip.size>35*1024*1024){setError('ZIP은 35MB 이하여야 합니다.');return;}
   setZipBusy(true);setZipMessage('ZIP 파일 확인 중');setError('');
   try{
     const bytes=new Uint8Array(await sourceZip.arrayBuffer());
     const entries=unzipSync(bytes);
     const match=Object.keys(entries).filter(k=>/^round(7[3-9]|80)\/manifest\.json$/.test(k));
     if(match.length!==1)throw Error('한 회차의 round80/manifest.json 형식이 필요합니다.');
     const target=Number(match[0].match(/^round(\d+)\//)[1]);
     const meta=JSON.parse(new TextDecoder().decode(entries[match[0]]));
     validate(meta,target,entries);
     const tickets=(await familyApi('upload_tickets',token,{round:target})).tickets;
     if(tickets.length!==50)throw Error('업로드 권한 50개를 받지 못했습니다.');
     for(let i=0;i<tickets.length;i++){
       const t=tickets[i];
       setZipMessage('이미지 업로드 '+(i+1)+' / 50');
       const {error:uploadError}=await supabase.storage.from(KHE_BUCKET)
         .uploadToSignedUrl(t.path,t.token,new Blob([entries[t.path]],{type:'image/webp'}),{contentType:'image/webp'});
       if(uploadError)throw Error(t.path+': '+uploadError.message);
     }
     setZipMessage('문항 목록 최종 반영 중');
     await familyApi('publish_manifest',token,{round:target,manifest:meta});
     setZipMessage('완료: '+target+'회 50문항 업로드');
     setSourceZip(null);await selectRound(target);
   }catch(err){setError('업로드 중단: '+err.message)}
   finally{setZipBusy(false);}
 }
 function copyLink(){if(newLink)navigator.clipboard.writeText(newLink).catch(()=>setError('복사할 수 없어요. 링크를 길게 눌러 복사해 주세요.'))}
 const errors=error?<Alert severity="warning" sx={{mb:2}}>{error}</Alert>:null;

 if(!token)return <Card sx={{maxWidth:630,mx:'auto'}}><CardContent sx={{p:4}}>
  <Stack spacing={2} alignItems="center" textAlign="center">
   <LockOutlined color="primary" sx={{fontSize:42}}/>
   <Typography variant="h5">가족 전용 기출문제</Typography>
   <Typography color="text.secondary">이 페이지는 누구나 볼 수 있지만, 실제 기출은 가족별 전용 링크를 가진 사람만 이용할 수 있어요.</Typography>
   <Alert severity="info" sx={{width:'100%'}}>회원가입·구글 로그인은 필요하지 않습니다. 관리자로부터 전용 링크를 받아 접속하세요.</Alert>
  </Stack>
 </CardContent></Card>;
 if(checking)return <Stack alignItems="center" py={8} spacing={2}><CircularProgress/><Typography color="text.secondary">전용 링크 확인 중</Typography></Stack>;
 if(!member)return <Stack sx={{maxWidth:650,mx:'auto'}} spacing={2}>
  {errors}<Button variant="outlined" onClick={clearLink}>잘못된 링크 지우기</Button>
 </Stack>;

 const active=current&&answers[current.id];
 return <Stack spacing={2.2}>
  <Paper variant="outlined" sx={{p:{xs:2,sm:3},borderRadius:3}}>
   <Stack direction={{xs:'column',sm:'row'}} gap={2} alignItems={{sm:'center'}} justifyContent="space-between">
    <Box><Typography variant="h5">가족 기출문제</Typography><Typography color="text.secondary" fontSize={13} sx={{mt:.6}}>{member.nickname} 전용 · 로그인 없이 이용</Typography></Box>
    <Stack direction="row" gap={1}><Chip color="success" label="전용 링크 확인됨"/>{member.role==='admin'&&<Button size="small" variant="outlined" onClick={()=>{setShowAdmin(!showAdmin);refreshMembers()}}>가족 관리</Button>}<Button size="small" color="inherit" onClick={clearLink}>이 기기 연결 해제</Button></Stack>
   </Stack>
  </Paper>
  {errors}
  {member.role==='admin'&&showAdmin&&<Card><CardContent sx={{p:3}}>
   <Typography variant="h6">가족 링크 관리</Typography>
   <Typography fontSize={12} color="text.secondary" sx={{mb:2}}>링크 자체가 신분증 역할을 합니다. 다른 사람에게 전달하지 말고, 유출되면 바로 폐기하세요.</Typography>
   <Stack direction={{xs:'column',sm:'row'}} spacing={1.2} sx={{mb:2}}>
    <TextField size="small" label="가족 이름 또는 별칭" value={nickname} onChange={e=>setNickname(e.target.value)} inputProps={{maxLength:40}} sx={{flex:1}}/>
    <Button variant="contained" disabled={!nickname.trim()||loading} onClick={createMember}>전용 링크 발급</Button>
   </Stack>
   {newLink&&<Alert severity="success" sx={{my:2}}><Typography fontSize={12} fontWeight={750}>새 링크는 발급 직후에만 표시돼요. 바로 가족에게 보내주세요.</Typography><Box sx={{overflowWrap:'anywhere',fontSize:12,mt:1}}>{newLink}</Box><Button sx={{mt:1}} onClick={copyLink} size="small" startIcon={<ContentCopyRounded/>}>링크 복사</Button></Alert>}
   {members.map(m=><Stack key={m.id} direction="row" alignItems="center" gap={1} justifyContent="space-between" sx={{py:1.1,borderTop:'1px solid #eee'}}>
    <Typography fontSize={13}>{m.nickname} · {m.role==='admin'?'관리자':'가족'} · {m.enabled?'사용 중':'폐기됨'}</Typography>
    {m.role!=='admin'&&m.enabled&&<Button color="error" size="small" onClick={()=>revokeMember(m.id)}>링크 폐기</Button>}
   </Stack>)}
   <Divider sx={{my:2}}/>
   <Typography variant="h6" sx={{mb:1}}>비공개 문제 ZIP 업로드</Typography>
   <Typography fontSize={12} color="text.secondary" sx={{mb:2}}>원본 이미지는 공개 GitHub에 올라가지 않고 비공개 Supabase Storage에 저장됩니다. 자료 이용 권한은 별도로 확인해야 합니다.</Typography>
   <Button variant="outlined" component="label" startIcon={<UploadFileRounded/>}>검증 ZIP 선택<input hidden type="file" accept=".zip,application/zip" onChange={e=>setSourceZip(e.target.files?.[0]||null)}/></Button>
   {sourceZip&&<Typography fontSize={12} sx={{mt:1}}>{sourceZip.name} ({(sourceZip.size/1048576).toFixed(1)} MB)</Typography>}
   <Stack direction="row" gap={1} alignItems="center" sx={{mt:1.4}}><Button variant="contained" disabled={!sourceZip||zipBusy} onClick={uploadZip}>비공개 업로드</Button>{zipBusy&&<CircularProgress size={22}/>}<Typography fontSize={12}>{zipMessage}</Typography></Stack>
  </CardContent></Card>}
  <Paper variant="outlined" sx={{p:{xs:2,sm:2.5},borderRadius:3}}>
   <Stack direction={{xs:'column',sm:'row'}} gap={1.4} alignItems={{sm:'center'}} justifyContent="space-between">
    <Box><Typography fontWeight={800}>심화 기출 회차</Typography><Typography color="text.secondary" fontSize={12}>제73~80회 · 50문항 / 회</Typography></Box>
    <Select size="small" value={round} onChange={e=>selectRound(Number(e.target.value))} sx={{minWidth:150}}>{ROUNDS.map(r=><MenuItem key={r} value={r}>제{r}회 심화</MenuItem>)}</Select>
   </Stack>
  </Paper>
  {loading&&!catalog&&<Stack alignItems="center" spacing={1} py={5}><CircularProgress/><Typography fontSize={13}>회차 정보를 확인하고 있어요.</Typography></Stack>}
  {!catalog&&!loading&&<Alert severity="info">선택한 회차의 기출문제는 아직 업로드되지 않았어요. {member.role==='admin'?'위의 가족 관리에서 검증 ZIP을 올릴 수 있습니다.':'관리자가 자료를 준비하고 있어요.'}</Alert>}
  {catalog&&!mode&&<Card><CardContent sx={{p:3}}>
    <Stack spacing={1.5}><Typography variant="h6">제{round}회 심화</Typography><Typography color="text.secondary">50문항 · 총 100점 · 실제 기출문제</Typography>
    <Alert severity="info" sx={{fontSize:12}}>현재 문항 이미지는 원본 확인용이며, 상세 해설과 공식 시험식 최종 채점은 이후 보완합니다.</Alert>
    <Grid container spacing={1.3}><Grid size={{xs:12,sm:6}}><Button fullWidth variant="contained" onClick={()=>start('study')}>바로 정답 확인하기</Button></Grid>
    <Grid size={{xs:12,sm:6}}><Button fullWidth variant="outlined" onClick={()=>start('test')}>실전 형식 풀기</Button></Grid></Grid>
    <Button variant="text" onClick={async()=>{try{const d=await familyApi('records',token);setRecords(d.records||[]);}catch(e){setError(e.message)}}}>내 학습기록 새로고침</Button>
    </Stack>
   </CardContent></Card>}
  {mode&&catalog&&current&&<Grid container spacing={2}>
    <Grid size={{xs:12,md:8}}><Card><CardContent sx={{p:{xs:2,sm:3}}}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}><Typography fontWeight={850}>제{round}회 {current.number}번</Typography><Chip size="small" label={current.points+'점'}/></Stack>
      <LinearProgress variant="determinate" value={(pos+1)/catalog.questions.length*100} sx={{height:6,borderRadius:4,my:2.2}}/>
      {imageBusy?<Box sx={{height:280,display:'grid',placeItems:'center'}}><CircularProgress/></Box>:imageUrl?
        <Box sx={{textAlign:'center',mb:2}}><Box component="img" onClick={()=>setZoom(true)} src={imageUrl} alt={round+'회 '+current.number+'번 기출문제 원본'} sx={{width:'100%',height:'auto',maxWidth:740,border:'1px solid #e1e6ef',borderRadius:2,cursor:'zoom-in'}}/><Button size="small" onClick={()=>setZoom(true)} startIcon={<ZoomInRounded/>}>확대 보기</Button></Box>:<Alert severity="warning">이미지 로드 실패</Alert>}
      <Typography fontWeight={800} fontSize={13} sx={{mb:1.4}}>답 선택</Typography>
      <Box sx={{display:'grid',gridTemplateColumns:'repeat(5,minmax(0,1fr))',gap:{xs:.7,sm:1.3}}}>{[1,2,3,4,5].map(n=><Button key={n} disabled={loading||(mode!=='test'&&Boolean(active))} variant={answers[current.id]===n?'contained':'outlined'} onClick={()=>selectAnswer(n)} sx={{minWidth:0,minHeight:50,fontWeight:800,fontSize:18}}>{['①','②','③','④','⑤'][n-1]}</Button>)}</Box>
      {mode!=='test'&&feedback[current.id]&&<Alert severity={feedback[current.id].correct?'success':'error'} sx={{mt:2}}>{feedback[current.id].correct?'정답입니다!':'오답입니다.'} 정답은 {['①','②','③','④','⑤'][feedback[current.id].correctAnswer-1]}번입니다.</Alert>}
      <Stack direction="row" justifyContent="space-between" mt={3} gap={1}>
       <Button variant="outlined" disabled={pos===0} onClick={()=>setPos(p=>Math.max(0,p-1))} startIcon={<ArrowBackRounded/>}>이전</Button>
       {pos===49?<Button variant="contained" onClick={()=>setMode(null)}>회차로 돌아가기</Button>:
       <Button variant="contained" disabled={!answers[current.id]} onClick={()=>setPos(p=>Math.min(49,p+1))} endIcon={<ArrowForwardRounded/>}>다음</Button>}
      </Stack>
    </CardContent></Card></Grid>
    <Grid size={{xs:12,md:4}}><Card sx={{position:{md:'sticky'},top:{md:90}}}><CardContent>
      <Typography variant="h6">답안 현황</Typography><Typography fontSize={12} color="text.secondary" sx={{my:1}}>{Object.keys(answers).length} / 50문항 선택</Typography>
      <Box sx={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:.5,mt:2}}>{catalog.questions.map((q,i)=><Button key={q.id} onClick={()=>setPos(i)} variant={pos===i?'contained':'outlined'} sx={{minWidth:0,p:0,px:0}}>{i+1}</Button>)}</Box>
      <Typography fontSize={12} color="text.secondary" sx={{mt:2}}>선택한 답은 이 가족 링크 계정에 저장됩니다. 실전 모드 정답은 문제를 푸는 동안 표시되지 않습니다.</Typography>
    </CardContent></Card></Grid>
  </Grid>}
  <Paper variant="outlined" sx={{p:2.2,borderRadius:3}}><Typography fontSize={13} fontWeight={800}>내 기록 요약</Typography><Typography fontSize={12} color="text.secondary">서버에 저장된 답안 {records.length}건 · 다른 가족과 기록이 섞이지 않습니다.</Typography></Paper>
  <Dialog open={zoom} onClose={()=>setZoom(false)} maxWidth="lg" fullWidth><DialogTitle>기출문제 이미지 확대</DialogTitle><DialogContent sx={{overflow:'auto'}}>{imageUrl&&<Box component="img" src={imageUrl} alt="확대한 문제" sx={{maxWidth:'none',width:{xs:'140%',sm:'100%'}}}/>}</DialogContent><DialogActions><Button onClick={()=>setZoom(false)}>닫기</Button></DialogActions></Dialog>
 </Stack>;
}
