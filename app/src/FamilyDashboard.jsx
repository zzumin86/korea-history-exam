import React,{useCallback,useEffect,useMemo,useState} from 'react';
import {Box,Typography,Button,Paper,Card,CardContent,Stack,Grid,Chip,Alert,LinearProgress,Select,MenuItem,TextField,
Dialog,DialogTitle,DialogContent,DialogActions,CircularProgress,Divider,IconButton,Tooltip} from '@mui/material';
import CloudUploadOutlined from '@mui/icons-material/CloudUploadOutlined';
import PeopleAltOutlined from '@mui/icons-material/PeopleAltOutlined';
import ContentCopyOutlined from '@mui/icons-material/ContentCopyOutlined';
import IosShareOutlined from '@mui/icons-material/IosShareOutlined';
import LinkOutlined from '@mui/icons-material/LinkOutlined';
import AutorenewOutlined from '@mui/icons-material/AutorenewOutlined';
import LockOutlined from '@mui/icons-material/LockOutlined';
import SchoolOutlined from '@mui/icons-material/SchoolOutlined';
import AddCircleOutline from '@mui/icons-material/AddCircleOutline';
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import ZoomInOutlined from '@mui/icons-material/ZoomInOutlined';
import HighlightOffOutlined from '@mui/icons-material/HighlightOffOutlined';
import CheckCircleOutline from '@mui/icons-material/CheckCircleOutline';
import {unzipSync} from 'fflate';
import {familyApi,supabase,KHE_BUCKET} from './kheSupabase';

const LOCAL_KEY='khe-private-link-v1';
const DEFAULT_POOL={rounds:[],total:0,questions:[]};
const WEB_LINK=(token)=>window.location.origin+import.meta.env.BASE_URL+'#key='+token;
function readLink(){
 const hash=window.location.hash.match(/^#key=([a-f0-9]{64})$/i);
 if(hash){
   const token=hash[1].toLowerCase();
   localStorage.setItem(LOCAL_KEY,token);
   window.history.replaceState({},'',window.location.pathname+window.location.search);
   return token;
 }
 return localStorage.getItem(LOCAL_KEY)||'';
}
function shuffled(items){
 const a=[...items];
 for(let i=a.length-1;i>0;i--){
   const bit=new Uint32Array(1);
   crypto.getRandomValues(bit);
   const j=bit[0]%(i+1);
   [a[i],a[j]]=[a[j],a[i]];
 }
 return a;
}
function checkBundle(m,round,entries){
 if(m?.round!==round||m?.level!=='advanced'||m?.total_questions!==50||m?.total_points!==100||
 !Array.isArray(m.questions)||m.questions.length!==50)throw Error(round+'회 문항 데이터 형식 오류');
 let total=0;const used=new Set();
 for(const q of m.questions){
   if(!Number.isInteger(q.number)||q.number<1||q.number>50||used.has(q.number))throw Error(round+'회 문제번호 중복·누락');
   if(!Number.isInteger(q.answer)||q.answer<1||q.answer>5||!Number.isInteger(q.points)||q.points<1||q.points>3)throw Error(round+'회 정답·배점 오류');
   const expected='round'+round+'/images/q'+String(q.number).padStart(2,'0')+'.webp';
   if(q.image!==expected||!entries[expected]?.length)throw Error(round+'회 '+q.number+'번 이미지 누락');
   used.add(q.number);total+=q.points;
 }
 if(total!==100)throw Error(round+'회 배점 합계가 100점이 아닙니다.');
}
const Label=({children})=><Typography fontWeight={800} fontSize={14}>{children}</Typography>;
const CardPaper=({children,sx={}})=><Card sx={{border:'1px solid #e2e8f1',borderRadius:3,boxShadow:'0 3px 16px #1b35500a',...sx}}><CardContent sx={{p:{xs:2.2,sm:3},'&:last-child':{pb:{xs:2.2,sm:3}}}}>{children}</CardContent></Card>;
export default function FamilyDashboard(){
 const [token,setToken]=useState(readLink);
 const [identity,setIdentity]=useState(null);
 const [booting,setBooting]=useState(true);
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');
 const [pool,setPool]=useState(DEFAULT_POOL);
 const [members,setMembers]=useState([]);
 const [records,setRecords]=useState([]);
 const [busy,setBusy]=useState(false);
 const [nick,setNick]=useState('');
 const [file,setFile]=useState(null);
 const [uploading,setUploading]=useState(false);
 const [uploadState,setUploadState]=useState('');
 const [showInactive,setShowInactive]=useState(false);
 const [visibleLink,setVisibleLink]=useState(null);
 const [dialogBusy,setDialogBusy]=useState(false);
 const [quizCount,setQuizCount]=useState(20);
 const [era,setEra]=useState('전체');
 const [quiz,setQuiz]=useState(null);
 const [image,setImage]=useState('');
 const [imageBusy,setImageBusy]=useState(false);
 const [zoom,setZoom]=useState(false);
 const isAdmin=identity?.role==='admin';

 const refresh=useCallback(async(id=identity,credential=token)=>{
   if(!credential)return;
   const calls=[
     familyApi('pool',credential),
     familyApi('records',credential),
     id?.role==='admin'?familyApi('members',credential):Promise.resolve({members:[]})
   ];
   const [p,r,m]=await Promise.all(calls);
   setPool(p);setRecords(r.records||[]);setMembers(m.members||[]);
 },[token,identity?.role]);

 useEffect(()=>{
   if(!token){setBooting(false);setIdentity(null);return;}
   let active=true;setBooting(true);setError('');
   (async()=>{
     try{
       const id=await familyApi('status',token);
       if(!active)return;
       setIdentity(id);
       try{await refresh(id,token);}
       catch(e){if(active)setError('문제은행·가족 명부를 불러오지 못했어요. 다시 열면 재시도할 수 있습니다.');}
     }catch(e){
       if(active){setError('전용 링크를 확인할 수 없습니다. 중지되었거나 변경된 링크일 수 있어요.');setIdentity(null);}
     }finally{if(active)setBooting(false);}
   })();
   return ()=>{active=false;};
 },[token]);

 const availableEra=useMemo(()=>[...new Set(pool.questions.map(x=>x.era).filter(Boolean))].sort(),[pool.questions]);
 const activeMembers=members.filter(x=>x.role!=='admin'&&x.enabled);
 const inactiveMembers=members.filter(x=>x.role!=='admin'&&!x.enabled);

 const current=quiz?.questions?.[quiz.index];
 useEffect(()=>{
   if(!current){setImage('');setImageBusy(false);return;}
   let active=true;setImage('');setImageBusy(true);
   familyApi('question',token,{round:current.exam_round,number:current.number})
    .then(r=>{if(active){setImage(r.url);setImageBusy(false);}})
    .catch(()=>{if(active){setImageBusy(false);setError('문제 이미지를 불러오지 못했어요.');}});
   return ()=>{active=false;};
 },[current?.id,token]);

 function clearCredential(){
   localStorage.removeItem(LOCAL_KEY);setToken('');setIdentity(null);setQuiz(null);
   setError('');setNotice('');
 }
 async function clipboard(value){
   try{await navigator.clipboard.writeText(value);setNotice('링크를 복사했어요. 가족에게 보내면 됩니다.');}
   catch{setError('자동 복사가 되지 않았어요. 링크를 길게 눌러 복사해 주세요.');}
 }
 async function share(value,name){
   try{
     if(navigator.share){await navigator.share({title:name+' 학습 링크',url:value});}
     else await clipboard(value);
   }catch(e){if(e?.name!=='AbortError')setError('공유가 취소되거나 실패했어요.');}
 }
 async function showLink(m){
   setDialogBusy(true);setError('');
   try{
     const data=m.role==='admin'?{token}:await familyApi('get_member_link',token,{memberId:m.id});
     setVisibleLink({id:m.id,name:m.nickname,url:WEB_LINK(data.token)});
   }catch(e){
     if(e.message==='link_reissue_required')setError('이전에 발급한 링크는 서버에 복원 정보가 없어요. 해당 카드에서 재발급하면 이후 언제든 다시 볼 수 있어요.');
     else setError('링크 확인 실패: '+e.message);
   }finally{setDialogBusy(false);}
 }
 async function shareMember(m){
   setDialogBusy(true);setError('');
   try{
     const data=await familyApi('get_member_link',token,{memberId:m.id});
     await share(WEB_LINK(data.token),m.nickname);
   }catch(e){
     setError(e.message==='link_reissue_required'
       ?'이 가족은 이전 방식으로 만든 링크예요. 한 번 재발급하면 카드에서 바로 공유할 수 있어요.'
       :'링크 공유 실패: '+e.message);
   }finally{setDialogBusy(false);}
 }
 async function createMember(){
   if(!nick.trim())return;
   setBusy(true);setError('');setNotice('');
   try{
     const m=await familyApi('create_member',token,{nickname:nick.trim()});
     setNick('');setVisibleLink({id:m.memberId,name:m.nickname,url:WEB_LINK(m.token)});
     await refresh();
   }catch(e){setError('가족 추가 실패: '+e.message);}
   finally{setBusy(false);}
 }
 async function reissue(m){
   if(!window.confirm(m.nickname+'의 기존 링크를 무효화하고 새 링크를 발급할까요?\n기존 학습기록은 그대로 유지됩니다.'))return;
   setBusy(true);setError('');
   try{
     const d=await familyApi('reissue_member_link',token,{memberId:m.id});
     setVisibleLink({id:d.memberId,name:d.nickname,url:WEB_LINK(d.token)});
     await refresh();
     setNotice(m.nickname+'의 기존 링크가 폐기되고 새 링크가 발급됐어요.');
   }catch(e){setError('링크 재발급 실패: '+e.message);}
   finally{setBusy(false);}
 }
 async function stopMember(m){
   if(!window.confirm(m.nickname+'의 링크를 중지할까요? 학습기록은 보존됩니다.'))return;
   setBusy(true);
   try{await familyApi('revoke_member',token,{memberId:m.id});await refresh();setNotice('링크가 중지됐어요.');}
   catch(e){setError('링크 중지 실패: '+e.message);}
   finally{setBusy(false);}
 }
 async function uploadAll(){
   if(!file||uploading)return;
   if(file.size>50*1024*1024){setError('통합 ZIP 크기는 50MB 이하여야 해요.');return;}
   setUploading(true);setError('');setNotice('');setUploadState('파일 구조 검사 중');
   try{
     const entries=unzipSync(new Uint8Array(await file.arrayBuffer()));
     const names=Object.keys(entries).filter(n=>/^round(7[3-9]|80)\/manifest\.json$/.test(n)).sort();
     if(!names.length)throw Error('73~80회 통합 ZIP 형식이 아닙니다.');
     const bundles=names.map(name=>{
       const round=Number(name.match(/^round(\d+)\//)[1]);
       const manifest=JSON.parse(new TextDecoder().decode(entries[name]));
       checkBundle(manifest,round,entries);return {round,manifest};
     });
     const present=new Set(pool.rounds||[]);
     const pending=bundles.filter(x=>!present.has(x.round));
     if(!pending.length){setNotice('이미 등록된 문제은행입니다.');setFile(null);return;}
     const total=pending.length*50;
     let uploaded=0;
     for(const bundle of pending){
       setUploadState('자료 전송 준비 중 · '+bundle.round+'회');
       const x=await familyApi('upload_tickets',token,{round:bundle.round});
       if(x.tickets?.length!==50)throw Error('업로드 권한 발급 오류');
       let pointer=0;
       const workers=Array.from({length:4},async()=>{
         while(pointer<x.tickets.length){
           const ticket=x.tickets[pointer++];
           const blob=new Blob([entries[ticket.path]],{type:'image/webp'});
           const {error:e}=await supabase.storage.from(KHE_BUCKET).uploadToSignedUrl(ticket.path,ticket.token,blob,{contentType:'image/webp'});
           if(e)throw Error(ticket.path+': '+e.message);
           uploaded++;
           setUploadState('전체 문제은행 등록 중 · '+uploaded+' / '+total+'개');
         }
       });
       await Promise.all(workers);
       await familyApi('publish_manifest',token,{round:bundle.round,manifest:bundle.manifest});
     }
     await refresh();
     setFile(null);
     setNotice('전체 문제은행 등록 완료! '+pending.length+'개 회차 · '+uploaded+'문항이 추가됐어요.');
     setUploadState('');
   }catch(e){setError('등록이 중단됐어요: '+e.message);}
   finally{setUploading(false);}
 }
 function startQuiz(kind){
   const candidates=pool.questions.filter(q=>kind!=='era'||era==='전체'||q.era===era);
   if(!candidates.length){setError('선택한 범위에서 사용 가능한 문제가 없습니다.');return;}
   const seen=new Set(records.map(r=>r.exam_round+'-'+String(r.question_number).padStart(2,'0')));
   const fresh=shuffled(candidates.filter(q=>!seen.has(q.id)));
   const old=shuffled(candidates.filter(q=>seen.has(q.id)));
   const selected=[...fresh,...old].slice(0,Math.min(kind==='test'?50:quizCount,candidates.length));
   setQuiz({kind,questions:selected,index:0,answers:{},feedback:{}});
   setError('');window.scrollTo(0,0);
 }
 async function pickAnswer(n){
   if(!current||busy||((quiz.kind!=='test')&&quiz.answers[current.id]))return;
   setBusy(true);setError('');
   try{
     const result=await familyApi('save_answer',token,{round:current.exam_round,number:current.number,selected:n,mode:quiz.kind});
     setQuiz(s=>({...s,answers:{...s.answers,[current.id]:n},
       feedback:quiz.kind==='test'?s.feedback:{...s.feedback,[current.id]:result}}));
     setRecords(prev=>[{exam_round:current.exam_round,question_number:current.number,answer_selected:n,is_correct:result.correct??null},
       ...prev.filter(r=>!(r.exam_round===current.exam_round&&r.question_number===current.number))]);
   }catch(e){setError('답안 저장 오류: '+e.message);}
   finally{setBusy(false);}
 }
 function MemberCard({item}){
   const admin=item.role==='admin';
   return <Grid size={{xs:12,sm:6,lg:4}}>
    <Paper variant="outlined" sx={{borderRadius:3,p:2.4,height:'100%',borderColor:item.enabled?'#dae4f0':'#eceef2',bgcolor:item.enabled?'#fff':'#f7f8fa'}}>
     <Stack direction="row" gap={1} alignItems="start" justifyContent="space-between">
       <Box sx={{width:42,height:42,borderRadius:2.4,bgcolor:admin?'#e8efff':'#edf5f7',display:'grid',placeItems:'center',color:'#24487a',fontWeight:850,fontSize:18}}>{item.nickname.slice(0,1)}</Box>
       <Chip size="small" label={admin?'관리자':item.enabled?'사용 중':'중지됨'} color={admin?'primary':item.enabled?'success':'default'} variant="outlined"/>
     </Stack>
     <Typography variant="h6" sx={{mt:1.6}}>{item.nickname}</Typography>
     <Typography color="text.secondary" fontSize={12}>{admin?'전체 관리 권한':'가족 학습기록 독립 저장'}</Typography>
     <Stack direction="row" flexWrap="wrap" gap={1} sx={{mt:2}}>
       {item.enabled&&<Button variant="outlined" size="small" startIcon={<LinkOutlined/>} disabled={busy||dialogBusy} onClick={()=>showLink(item)}>링크 보기</Button>}
       {!admin&&item.enabled&&<Button variant="outlined" size="small" startIcon={<IosShareOutlined/>} disabled={busy||dialogBusy} onClick={()=>shareMember(item)}>바로 공유</Button>}
       {!admin&&<Button variant="outlined" size="small" startIcon={<AutorenewOutlined/>} disabled={busy} onClick={()=>reissue(item)}>{item.enabled?'재발급':'링크 복구'}</Button>}
       {!admin&&item.enabled&&<Button color="error" variant="text" size="small" disabled={busy} onClick={()=>stopMember(item)}>중지</Button>}
     </Stack>
    </Paper>
   </Grid>;
 }
 if(booting)return <Stack alignItems="center" spacing={2} sx={{py:10}}><CircularProgress/><Typography color="text.secondary">가족 링크 확인 중…</Typography></Stack>;
 if(!identity)return <Box sx={{maxWidth:590,mx:'auto',py:4}}><CardPaper>
   <Stack alignItems="center" textAlign="center" gap={2}>
     <LockOutlined sx={{fontSize:50,color:'primary.main'}}/>
     <Typography variant="h5">가족 전용 공부방</Typography>
     <Typography color="text.secondary" fontSize={14}>회원가입은 필요하지 않아요. 관리자가 전달한 개인 전용 링크로 접속하면 자동으로 본인 학습기록을 사용할 수 있어요.</Typography>
     {error&&<Alert severity="warning">{error}</Alert>}
     <Button onClick={clearCredential} variant="text">잘못된 링크 지우기</Button>
   </Stack>
 </CardPaper></Box>;
 const adminCard=members.find(m=>m.role==='admin');
 return <Stack spacing={2.5}>
   <Box sx={{pb:.5}}>
     <Stack direction={{xs:'column',sm:'row'}} gap={1} alignItems={{sm:'center'}} justifyContent="space-between">
       <Box><Typography variant="h4" sx={{fontSize:{xs:24,md:29}}}>{isAdmin?'가족 공부방 관리':'한국사 문제풀이'}</Typography>
       <Typography color="text.secondary" sx={{fontSize:13,mt:.7}}>{identity.nickname} 님 · 전용 링크 접속 중</Typography></Box>
       <Button size="small" onClick={clearCredential} color="inherit">이 기기 연결 해제</Button>
     </Stack>
   </Box>
   {error&&<Alert severity="warning" onClose={()=>setError('')}>{error}</Alert>}
   {notice&&<Alert severity="success" onClose={()=>setNotice('')}>{notice}</Alert>}

   {isAdmin&&!quiz&&<CardPaper>
     <Stack direction={{xs:'column',sm:'row'}} justifyContent="space-between" alignItems={{sm:'center'}} gap={1}>
       <Box><Stack direction="row" alignItems="center" gap={1}><CloudUploadOutlined color="primary"/><Typography variant="h6">① 문제은행 전체 등록</Typography></Stack>
       <Typography fontSize={13} color="text.secondary" sx={{mt:.9}}>73~80회 자료를 하나로 등록하면, 가족은 회차를 고르지 않고 전체 문제에서 랜덤으로 풀어요.</Typography></Box>
       <Chip color={pool.total===400?'success':'primary'} label={pool.total+' / 400문항'}/>
     </Stack>
     <LinearProgress variant="determinate" value={Math.min(100,pool.total/400*100)} sx={{height:7,borderRadius:5,mt:2.2,mb:2.4}}/>
     {pool.total===400?<Alert severity="success">문제은행 400문항 등록 완료. 가족에게 링크를 전달하면 바로 학습할 수 있어요.</Alert>:<Stack direction={{xs:'column',sm:'row'}} gap={1.4} alignItems={{sm:'center'}}>
       <Button component="label" variant="outlined" disabled={uploading} startIcon={<CloudUploadOutlined/>}>전체 문제 ZIP 선택<input hidden type="file" accept=".zip,application/zip" onChange={e=>setFile(e.target.files?.[0]||null)}/></Button>
       <Button variant="contained" disabled={!file||uploading} onClick={uploadAll}>전체 등록 시작</Button>
       <Typography fontSize={12} color="text.secondary">{file?file.name:'최초 한 번만 등록 · 등록된 문항은 자동 건너뛰기'}</Typography>
     </Stack>}
     {uploading&&<Stack direction="row" alignItems="center" gap={1.4} sx={{mt:2}}><CircularProgress size={19}/><Typography fontSize={12}>{uploadState}</Typography></Stack>}
   </CardPaper>}

   {isAdmin&&!quiz&&<CardPaper>
      <Stack direction="row" alignItems="center" gap={1} sx={{mb:1}}><PeopleAltOutlined color="primary"/><Typography variant="h6">② 가족 명부</Typography><Chip label={activeMembers.length+'명 사용 중'} size="small"/></Stack>
      <Typography fontSize={13} color="text.secondary" sx={{mb:2.5}}>가족 카드를 만든 뒤 링크를 복사하거나 공유해 주세요. 잃어버리면 같은 카드에서 재발급하면 됩니다.</Typography>
      <Stack direction={{xs:'column',sm:'row'}} gap={1} sx={{mb:2.5}}>
        <TextField label="이름 또는 별칭" value={nick} onChange={e=>setNick(e.target.value)} size="small" fullWidth inputProps={{maxLength:40}} onKeyDown={e=>{if(e.key==='Enter')createMember();}}/>
        <Button variant="contained" disabled={!nick.trim()||busy} onClick={createMember} startIcon={<AddCircleOutline/>} sx={{whiteSpace:'nowrap',minWidth:120}}>가족 추가</Button>
      </Stack>
      <Grid container spacing={1.5}>
        {adminCard&&<MemberCard item={adminCard}/>}
        {activeMembers.map(m=><MemberCard key={m.id} item={m}/>)}
      </Grid>
      {inactiveMembers.length>0&&<Box sx={{mt:2.4}}>
        <Button size="small" color="inherit" onClick={()=>setShowInactive(!showInactive)}>{showInactive?'중지된 가족 접기':'중지된 가족 '+inactiveMembers.length+'명 보기'}</Button>
        {showInactive&&<Grid container spacing={1.5} sx={{mt:1}}>{inactiveMembers.map(m=><MemberCard key={m.id} item={m}/>)}</Grid>}
      </Box>}
   </CardPaper>}

   {!quiz&&<CardPaper>
      <Stack direction="row" alignItems="center" gap={1} sx={{mb:.8}}><SchoolOutlined color="primary"/><Typography variant="h6">{isAdmin?'③ 전체 혼합 학습':'전체 혼합 랜덤 학습'}</Typography></Stack>
      <Typography color="text.secondary" fontSize={13}>업로드된 모든 회차에서 매번 새로 섞어서 출제합니다. 미풀이 문제를 우선하고 같은 세트에는 중복이 없어요.</Typography>
      <Grid container spacing={1.6} sx={{mt:1.6,mb:2.3}}>
        <Grid size={{xs:6,sm:4}}><Paper sx={{p:2,bgcolor:'#f3f6fb',textAlign:'center'}} elevation={0}><Typography variant="h5" fontWeight={850}>{pool.total}</Typography><Typography fontSize={12} color="text.secondary">전체 등록 문제</Typography></Paper></Grid>
        <Grid size={{xs:6,sm:4}}><Paper sx={{p:2,bgcolor:'#f3f6fb',textAlign:'center'}} elevation={0}><Typography variant="h5" fontWeight={850}>{records.length}</Typography><Typography fontSize={12} color="text.secondary">내가 푼 문제</Typography></Paper></Grid>
        <Grid size={{xs:12,sm:4}}><Paper sx={{p:2,bgcolor:'#f3f6fb',textAlign:'center'}} elevation={0}><Typography variant="h5" fontWeight={850}>{records.filter(x=>x.is_correct===false).length}</Typography><Typography fontSize={12} color="text.secondary">틀린 문제</Typography></Paper></Grid>
      </Grid>
      <Stack direction={{xs:'column',sm:'row'}} alignItems={{sm:'center'}} gap={1.5} sx={{mb:2}}>
        <Label>학습 문제 수</Label>
        <Select value={quizCount} size="small" onChange={e=>setQuizCount(Number(e.target.value))} sx={{minWidth:140}}>{[10,20,50].map(n=><MenuItem key={n} value={n}>{n}문항</MenuItem>)}</Select>
      </Stack>
      <Grid container spacing={1.2}>
        <Grid size={{xs:12,sm:6}}><Button fullWidth variant="contained" disabled={!pool.total} onClick={()=>startQuiz('study')}>전체 혼합 · 바로 정답 확인</Button></Grid>
        <Grid size={{xs:12,sm:6}}><Button fullWidth variant="outlined" disabled={!pool.total} onClick={()=>startQuiz('test')}>전체 혼합 · 50문항 실전</Button></Grid>
      </Grid>
      <Divider sx={{my:2.5}}/>
      <Stack spacing={1.4}>
        <Label>시대별 집중 학습</Label>
        {availableEra.length>0?<Stack direction={{xs:'column',sm:'row'}} gap={1}>
          <Select size="small" value={era} onChange={e=>setEra(e.target.value)} sx={{flex:1}}>
            <MenuItem value="전체">전체 시대</MenuItem>
            {availableEra.map(e=><MenuItem key={e} value={e}>{e}</MenuItem>)}
          </Select>
          <Button variant="outlined" onClick={()=>startQuiz('era')}>선택한 시대 풀기</Button>
        </Stack>:<Alert severity="info" sx={{fontSize:13}}>시대 분류는 검증 중이에요. 검증 전에는 시대를 임의로 붙이지 않고 전체 혼합으로 이용합니다.</Alert>}
      </Stack>
      {!pool.total&&<Alert severity="info" sx={{mt:2}}>아직 전체 문제은행 등록이 완료되지 않았어요. {isAdmin?'위의 문제은행 등록을 먼저 진행해 주세요.':'관리자가 기출 자료를 등록하면 자동으로 이용할 수 있어요.'}</Alert>}
   </CardPaper>}

   {quiz&&<Grid container spacing={2}>
     <Grid size={{xs:12,md:8}}><CardPaper>
       <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
         <Box><Typography variant="h6">{quiz.kind==='test'?'실전 방식 학습':'바로 정답 확인'}</Typography>
         <Typography color="text.secondary" fontSize={12}>전체 회차 혼합 · {quiz.index+1} / {quiz.questions.length}번</Typography></Box>
         <Button color="inherit" size="small" onClick={()=>setQuiz(null)}>학습 종료</Button>
       </Stack>
       <LinearProgress variant="determinate" value={((quiz.index+1)/quiz.questions.length)*100} sx={{height:6,borderRadius:3,my:2}}/>
       <Stack direction="row" justifyContent="space-between" sx={{mb:1}}><Chip size="small" label={'출처 '+current.exam_round+'회 · '+current.number+'번'}/><Chip size="small" label={current.points+'점'}/></Stack>
       {imageBusy?<Box sx={{height:300,display:'grid',placeItems:'center'}}><CircularProgress/></Box>:image?
         <Box sx={{mb:1,textAlign:'center'}}><Box component="img" src={image} alt="기출문제 원문" onClick={()=>setZoom(true)} sx={{maxWidth:'100%',height:'auto',border:'1px solid #dae3ef',borderRadius:2,cursor:'zoom-in'}}/>
         <Button startIcon={<ZoomInOutlined/>} onClick={()=>setZoom(true)} size="small">원본 확대</Button></Box>:<Alert severity="warning">문제 이미지를 불러오지 못했어요.</Alert>}
       <Typography fontWeight={800} fontSize={13} sx={{mt:1.5,mb:1}}>답안 선택</Typography>
       <Box sx={{display:'grid',gridTemplateColumns:'repeat(5,minmax(0,1fr))',gap:1}}>
         {[1,2,3,4,5].map(n=><Button key={n} variant={quiz.answers[current.id]===n?'contained':'outlined'} disabled={busy||(quiz.kind!=='test'&&Boolean(quiz.answers[current.id]))}
           sx={{minWidth:0,minHeight:52,fontSize:17,fontWeight:800}}
           onClick={()=>pickAnswer(n)}>{['①','②','③','④','⑤'][n-1]}</Button>)}
       </Box>
       {quiz.kind!=='test'&&quiz.feedback[current.id]&&<Alert severity={quiz.feedback[current.id].correct?'success':'error'} sx={{mt:2}}>
         {quiz.feedback[current.id].correct?'정답입니다!':'틀렸습니다.'} 정답은 {['①','②','③','④','⑤'][quiz.feedback[current.id].correctAnswer-1]}번입니다.
       </Alert>}
       <Stack direction="row" justifyContent="space-between" sx={{mt:3}}>
         <Button variant="outlined" startIcon={<ArrowBackRounded/>} disabled={quiz.index===0} onClick={()=>setQuiz(s=>({...s,index:s.index-1}))}>이전</Button>
         {quiz.index===quiz.questions.length-1?<Button variant="contained" disabled={!quiz.answers[current.id]} onClick={()=>setQuiz(null)}>학습 마치기</Button>:
         <Button variant="contained" endIcon={<ArrowForwardRounded/>} disabled={!quiz.answers[current.id]}
           onClick={()=>setQuiz(s=>({...s,index:s.index+1}))}>다음</Button>}
       </Stack>
     </CardPaper></Grid>
     <Grid size={{xs:12,md:4}}><CardPaper sx={{position:{md:'sticky'},top:{md:88}}}>
       <Label>답안 현황</Label>
       <Typography fontSize={12} color="text.secondary" sx={{mt:.8,mb:2}}>{Object.keys(quiz.answers).length} / {quiz.questions.length} 선택</Typography>
       <Box sx={{display:'grid',gridTemplateColumns:'repeat(5,minmax(0,1fr))',gap:.7}}>
         {quiz.questions.map((q,i)=><Button key={q.id} size="small" variant={quiz.index===i?'contained':'outlined'} sx={{minWidth:0,p:0}}
           onClick={()=>setQuiz(s=>({...s,index:i}))}>{i+1}</Button>)}
       </Box>
     </CardPaper></Grid>
   </Grid>}

   <Dialog open={Boolean(visibleLink)} onClose={()=>setVisibleLink(null)} fullWidth maxWidth="sm">
      <DialogTitle>{visibleLink?.name} 전용 링크</DialogTitle>
      <DialogContent><Typography fontSize={13} color="text.secondary" sx={{mb:1.6}}>이 링크를 가진 사람은 해당 가족의 학습기록을 열 수 있어요. 필요한 사람에게만 공유하세요.</Typography>
        <Paper variant="outlined" sx={{p:1.8,borderRadius:2,overflowWrap:'anywhere',fontSize:13,userSelect:'all'}}>{visibleLink?.url}</Paper>
      </DialogContent>
      <DialogActions sx={{px:3,pb:2.5}}>
        <Button startIcon={<ContentCopyOutlined/>} onClick={()=>clipboard(visibleLink.url)}>복사</Button>
        <Button variant="contained" startIcon={<IosShareOutlined/>} onClick={()=>share(visibleLink.url,visibleLink.name)}>공유</Button>
        <Button color="inherit" onClick={()=>setVisibleLink(null)}>닫기</Button>
      </DialogActions>
   </Dialog>
   <Dialog open={zoom} onClose={()=>setZoom(false)} fullWidth maxWidth="lg">
      <DialogTitle>문제 이미지 확대</DialogTitle>
      <DialogContent sx={{overflow:'auto'}}>{image&&<Box component="img" src={image} alt="확대한 기출문제" sx={{width:{xs:'150%',sm:'100%'},maxWidth:'none'}}/>}</DialogContent>
      <DialogActions><Button onClick={()=>setZoom(false)}>닫기</Button></DialogActions>
   </Dialog>
 </Stack>;
}
