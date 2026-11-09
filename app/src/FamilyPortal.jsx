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
 const [pool,setPool]=useState({rounds:[],total:0,questions:[]});
 const [poolBusy,setPoolBusy]=useState(false);
 const [sequence,setSequence]=useState([]);
 const [quizCount,setQuizCount]=useState(20);
 const [era,setEra]=useState('전체');
 const [showRound,setShowRound]=useState(false);
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
 async function refreshPool(){
   setPoolBusy(true);
   try{const result=await familyApi('pool',token);setPool(result);}
   catch(e){setError('문제은행 조회 실패: '+e.message);}
   finally{setPoolBusy(false);}
 }
 useEffect(()=>{if(member)refreshPool();},[member?.memberId]);

 useEffect(()=>{
   if(!member)return;
   familyApi('records',token).then(x=>setRecords(x.records||[])).catch(()=>{});
 },[member?.memberId]);

 const current=mode&&sequence.length?sequence[pos]:null;
 const eras=useMemo(()=>[...new Set(pool.questions.map(q=>q.era).filter(Boolean))].sort(),[pool]);
 useEffect(()=>{
   let active=true;
   setImageUrl('');setImageBusy(Boolean(current));
   if(current)familyApi('question',token,{round:current.exam_round,number:current.number})
     .then(data=>{if(active){setImageUrl(data.url);setImageBusy(false)}})
     .catch(err=>{if(active){setImageBusy(false);setError('이미지를 불러오지 못했습니다: '+err.message)}});
   return ()=>{active=false};
 },[token,current?.id]);

 function clearLink(){
   localStorage.removeItem(STORAGE);
   setToken('');setMember(null);setMode(null);setCatalog(null);setError('');
 }
 function start(m){
   let available=m==='round'
     ?(catalog?.questions||[]).map(q=>({...q,exam_round:round}))
     :pool.questions.filter(q=>m!=='era'||era==='전체'||q.era===era);
   if(!available.length){setError('선택한 조건에 해당하는 업로드된 문제가 없습니다.');return;}
   if(m==='round')available=[...available].sort((a,b)=>a.number-b.number);
   else{
     const completed=new Set(records.map(x=>x.exam_round+'-'+String(x.question_number).padStart(2,'0')));
     const fresh=available.filter(q=>!completed.has(q.id));
     const solved=available.filter(q=>completed.has(q.id));
     const shuffle=list=>{
       list=[...list];
       for(let i=list.length-1;i>0;i--){
         const a=new Uint32Array(1);crypto.getRandomValues(a);
         const j=a[0]%(i+1);
         [list[i],list[j]]=[list[j],list[i]];
       }
       return list;
     };
     available=[...shuffle(fresh),...shuffle(solved)].slice(0,Math.min(m==='test'?50:quizCount,available.length));
   }
   setSequence(available);setMode(m==='round'?'test':m);setPos(0);
   setAnswers({});setFeedback({});setError('');
 }
 async function selectAnswer(n){
   if(!current||loading||(mode!=='test' && answers[current.id]))return;
   setLoading(true);setError('');
   try{
     const data=await familyApi('save_answer',token,{round:current.exam_round,number:current.number,selected:n,mode});
     setAnswers(s=>({...s,[current.id]:n}));
     setRecords(s=>[{exam_round:current.exam_round,question_number:current.number,answer_selected:n,last_mode:mode,answered_at:new Date().toISOString()},
       ...s.filter(x=>!(x.exam_round===current.exam_round && x.question_number===current.number))]);
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
   if(sourceZip.size>50*1024*1024){setError('ZIP은 50MB 이하여야 합니다.');return;}
   setZipBusy(true);setZipMessage('ZIP 파일 검사 중');setError('');
   try{
     const entries=unzipSync(new Uint8Array(await sourceZip.arrayBuffer()));
     const names=Object.keys(entries).filter(k=>/^round(7[3-9]|80)\/manifest\.json$/.test(k)).sort();
     if(!names.length||names.length>8)throw Error('round73~80/manifest.json 항목이 필요합니다.');
     const packages=names.map(name=>{
       const r=Number(name.match(/^round(\d+)\//)[1]);
       const manifest=JSON.parse(new TextDecoder().decode(entries[name]));
       validate(manifest,r,entries);
       return {round:r,manifest};
     });
     let done=0,total=packages.length*50;
     for(const pack of packages){
       setZipMessage(pack.round+'회 업로드 권한 발급 중');
       const tickets=(await familyApi('upload_tickets',token,{round:pack.round})).tickets;
       if(tickets.length!==50)throw Error(pack.round+'회 업로드 권한이 부족합니다.');
       let next=0;
       const workers=Array.from({length:4},async()=>{
         while(next<tickets.length){
           const i=next++;const ticket=tickets[i];
           const bytes=entries[ticket.path];
           if(!bytes)throw Error('이미지 누락: '+ticket.path);
           const {error:uploadError}=await supabase.storage.from(KHE_BUCKET).uploadToSignedUrl(
             ticket.path,ticket.token,new Blob([bytes],{type:'image/webp'}),{contentType:'image/webp'});
           if(uploadError)throw Error(ticket.path+': '+uploadError.message);
           done++;setZipMessage('비공개 업로드 '+done+' / '+total+'문항');
         }
       });
       await Promise.all(workers);
       await familyApi('publish_manifest',token,{round:pack.round,manifest:pack.manifest});
     }
     setZipMessage('완료: '+packages.length+'개 회차 / '+done+'문항');
     setSourceZip(null);setCatalog(null);setShowRound(false);
     await refreshPool();
   }catch(err){setError('업로드 중단: '+err.message);}
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
   <Button variant="outlined" component="label" startIcon={<UploadFileRounded/>}>회차별 또는 통합 ZIP 선택<input hidden type="file" accept=".zip,application/zip" onChange={e=>setSourceZip(e.target.files?.[0]||null)}/></Button>
   {sourceZip&&<Typography fontSize={12} sx={{mt:1}}>{sourceZip.name} ({(sourceZip.size/1048576).toFixed(1)} MB)</Typography>}
   <Stack direction="row" gap={1} alignItems="center" sx={{mt:1.4}}><Button variant="contained" disabled={!sourceZip||zipBusy} onClick={uploadZip}>비공개 업로드</Button>{zipBusy&&<CircularProgress size={22}/>}<Typography fontSize={12}>{zipMessage}</Typography></Stack>
  </CardContent></Card>}
  {!mode&&<Card><CardContent sx={{p:{xs:2.2,sm:3}}}>
    <Stack direction={{xs:'column',sm:'row'}} gap={2} alignItems={{sm:'center'}} justifyContent="space-between">
      <Box>
        <Typography variant="h6">전체 기출 랜덤 학습</Typography>
        <Typography color="text.secondary" fontSize={13} sx={{mt:.6}}>업로드된 모든 회차에서 매번 무작위로 문제를 뽑아요. 같은 세트에 중복 문제는 나오지 않습니다.</Typography>
      </Box>
      <Chip color="primary" label={pool.total+'문항 · '+pool.rounds.length+'개 회차'}/>
    </Stack>
    {poolBusy&&<LinearProgress sx={{mt:2}}/>}
    {pool.total>0?<Stack spacing={2} sx={{mt:2.5}}>
      <Stack direction={{xs:'column',sm:'row'}} alignItems={{sm:'center'}} gap={1.2}>
        <Typography fontSize={13} fontWeight={800}>학습 문제 수</Typography>
        <Select size="small" value={quizCount} onChange={e=>setQuizCount(Number(e.target.value))} sx={{minWidth:125}}>
          {[10,20,50].map(n=><MenuItem key={n} value={n}>{n}문항</MenuItem>)}
        </Select>
        <Typography fontSize={12} color="text.secondary">매번 새로 섞어서 출제</Typography>
      </Stack>
      <Grid container spacing={1.2}>
        <Grid size={{xs:12,sm:6}}><Button fullWidth variant="contained" onClick={()=>start('study')}>전체 혼합 · 바로 정답 확인</Button></Grid>
        <Grid size={{xs:12,sm:6}}><Button fullWidth variant="outlined" onClick={()=>start('test')}>전체 혼합 · 50문항 시험</Button></Grid>
      </Grid>
      <Divider/>
      <Typography fontWeight={800} fontSize={14}>시대별 집중 학습</Typography>
      {eras.length?<Stack spacing={1.2}>
        <Stack direction={{xs:'column',sm:'row'}} gap={1.2}>
          <Select size="small" value={era} onChange={e=>setEra(e.target.value)} sx={{flex:1}}>
            <MenuItem value="전체">모든 시대</MenuItem>
            {eras.map(e=><MenuItem key={e} value={e}>{e}</MenuItem>)}
          </Select>
          <Button variant="outlined" onClick={()=>start('era')}>선택한 시대 풀기</Button>
        </Stack>
        <Typography color="text.secondary" fontSize={12}>시대 태그가 검증된 문항만 해당 시대에 포함돼요.</Typography>
      </Stack>:<Alert severity="info" sx={{fontSize:12}}>시대 분류는 검증 전이라 아직 제공하지 않습니다. 전체 혼합·회차별 풀이부터 이용할 수 있어요.</Alert>}
    </Stack>:<Alert severity="info" sx={{mt:2}}>아직 업로드된 기출문제가 없어요. 관리자가 위의 가족 관리에서 통합 ZIP을 업로드하면 자동으로 문제은행에 추가돼요.</Alert>}
   </CardContent></Card>}
   {!mode&&<Paper variant="outlined" sx={{p:2.5,borderRadius:3}}>
     <Stack direction={{xs:'column',sm:'row'}} gap={1.5} alignItems={{sm:'center'}} justifyContent="space-between">
       <Box><Typography fontWeight={800}>실제 회차 순서대로 풀기</Typography><Typography color="text.secondary" fontSize={12}>전체 혼합과 별개로, 특정 기출 회차 50문항을 그대로 풀 때만 이용</Typography></Box>
       <Stack direction="row" gap={1}>
         <Select size="small" value={round} onChange={e=>setRound(Number(e.target.value))} sx={{minWidth:125}}>{ROUNDS.map(r=><MenuItem key={r} value={r}>제{r}회</MenuItem>)}</Select>
         <Button variant="outlined" onClick={()=>{setShowRound(true);selectRound(round)}}>불러오기</Button>
       </Stack>
     </Stack>
     {showRound&&loading&&<LinearProgress sx={{mt:2}}/>}
     {showRound&&catalog&&!loading&&<Button sx={{mt:2}} variant="contained" onClick={()=>start('round')}>제{round}회 실전 50문항 시작</Button>}
     {showRound&&!catalog&&!loading&&<Typography sx={{mt:1.5}} fontSize={12} color="text.secondary">이 회차는 아직 업로드되지 않았어요.</Typography>}
   </Paper>}
  {mode&&sequence.length>0&&current&&<Grid container spacing={2}>
    <Grid size={{xs:12,md:8}}><Card><CardContent sx={{p:{xs:2,sm:3}}}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}><Typography fontWeight={850}>제{current.exam_round}회 {current.number}번</Typography><Chip size="small" label={current.points+'점'}/></Stack>
      <LinearProgress variant="determinate" value={(pos+1)/sequence.length*100} sx={{height:6,borderRadius:4,my:2.2}}/>
      {imageBusy?<Box sx={{height:280,display:'grid',placeItems:'center'}}><CircularProgress/></Box>:imageUrl?
        <Box sx={{textAlign:'center',mb:2}}><Box component="img" onClick={()=>setZoom(true)} src={imageUrl} alt={current.exam_round+'회 '+current.number+'번 기출문제 원본'} sx={{width:'100%',height:'auto',maxWidth:740,border:'1px solid #e1e6ef',borderRadius:2,cursor:'zoom-in'}}/><Button size="small" onClick={()=>setZoom(true)} startIcon={<ZoomInRounded/>}>확대 보기</Button></Box>:<Alert severity="warning">이미지 로드 실패</Alert>}
      <Typography fontWeight={800} fontSize={13} sx={{mb:1.4}}>답 선택</Typography>
      <Box sx={{display:'grid',gridTemplateColumns:'repeat(5,minmax(0,1fr))',gap:{xs:.7,sm:1.3}}}>{[1,2,3,4,5].map(n=><Button key={n} disabled={loading||(mode!=='test'&&Boolean(active))} variant={answers[current.id]===n?'contained':'outlined'} onClick={()=>selectAnswer(n)} sx={{minWidth:0,minHeight:50,fontWeight:800,fontSize:18}}>{['①','②','③','④','⑤'][n-1]}</Button>)}</Box>
      {mode!=='test'&&feedback[current.id]&&<Alert severity={feedback[current.id].correct?'success':'error'} sx={{mt:2}}>{feedback[current.id].correct?'정답입니다!':'오답입니다.'} 정답은 {['①','②','③','④','⑤'][feedback[current.id].correctAnswer-1]}번입니다.</Alert>}
      <Stack direction="row" justifyContent="space-between" mt={3} gap={1}>
       <Button variant="outlined" disabled={pos===0} onClick={()=>setPos(p=>Math.max(0,p-1))} startIcon={<ArrowBackRounded/>}>이전</Button>
       {pos===sequence.length-1?<Button variant="contained" onClick={()=>setMode(null)}>학습 마치기</Button>:
       <Button variant="contained" disabled={!answers[current.id]} onClick={()=>setPos(p=>Math.min(sequence.length-1,p+1))} endIcon={<ArrowForwardRounded/>}>다음</Button>}
      </Stack>
    </CardContent></Card></Grid>
    <Grid size={{xs:12,md:4}}><Card sx={{position:{md:'sticky'},top:{md:90}}}><CardContent>
      <Typography variant="h6">답안 현황</Typography><Typography fontSize={12} color="text.secondary" sx={{my:1}}>{Object.keys(answers).length} / {sequence.length}문항 선택</Typography>
      <Box sx={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:.5,mt:2}}>{sequence.map((q,i)=><Button key={q.id} onClick={()=>setPos(i)} variant={pos===i?'contained':'outlined'} sx={{minWidth:0,p:0,px:0}}>{i+1}</Button>)}</Box>
      <Typography fontSize={12} color="text.secondary" sx={{mt:2}}>선택한 답은 이 가족 링크 계정에 저장됩니다. 실전 모드 정답은 문제를 푸는 동안 표시되지 않습니다.</Typography>
    </CardContent></Card></Grid>
  </Grid>}
  <Paper variant="outlined" sx={{p:2.2,borderRadius:3}}><Typography fontSize={13} fontWeight={800}>내 기록 요약</Typography><Typography fontSize={12} color="text.secondary">서버에 저장된 답안 {records.length}건 · 다른 가족과 기록이 섞이지 않습니다.</Typography></Paper>
  <Dialog open={zoom} onClose={()=>setZoom(false)} maxWidth="lg" fullWidth><DialogTitle>기출문제 이미지 확대</DialogTitle><DialogContent sx={{overflow:'auto'}}>{imageUrl&&<Box component="img" src={imageUrl} alt="확대한 문제" sx={{maxWidth:'none',width:{xs:'140%',sm:'100%'}}}/>}</DialogContent><DialogActions><Button onClick={()=>setZoom(false)}>닫기</Button></DialogActions></Dialog>
 </Stack>;
}
