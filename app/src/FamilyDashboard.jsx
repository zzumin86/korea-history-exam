import React,{useCallback,useEffect,useMemo,useState} from 'react';
import {Box,Typography,Button,Paper,Card,CardContent,Stack,Grid,Chip,Alert,LinearProgress,Select,MenuItem,TextField,
Dialog,DialogTitle,DialogContent,DialogActions,CircularProgress,Divider,IconButton,Tooltip,
 BottomNavigation,BottomNavigationAction,Tabs,Tab} from '@mui/material';
import CloudUploadOutlined from '@mui/icons-material/CloudUploadOutlined';
import PeopleAltOutlined from '@mui/icons-material/PeopleAltOutlined';
import ContentCopyOutlined from '@mui/icons-material/ContentCopyOutlined';
import IosShareOutlined from '@mui/icons-material/IosShareOutlined';
import LinkOutlined from '@mui/icons-material/LinkOutlined';
import AutorenewOutlined from '@mui/icons-material/AutorenewOutlined';
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded';
import LockOutlined from '@mui/icons-material/LockOutlined';
import SchoolOutlined from '@mui/icons-material/SchoolOutlined';
import HomeRounded from '@mui/icons-material/HomeRounded';
import AutoStoriesRounded from '@mui/icons-material/AutoStoriesRounded';
import TimerRounded from '@mui/icons-material/TimerRounded';
import HistoryEduRounded from '@mui/icons-material/HistoryEduRounded';
import FactCheckRounded from '@mui/icons-material/FactCheckRounded';
import ManageAccountsRounded from '@mui/icons-material/ManageAccountsRounded';
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
const ERA_ORDER=['선사','고조선·여러 나라','삼국·가야','남북국','고려','조선','개항기·대한제국','일제강점기','현대','시대종합'];
const WEB_LINK=(token)=>window.location.origin+import.meta.env.BASE_URL+'#key='+token;
function tokenInAddress(){
 const match=window.location.hash.match(/^#key=([a-f0-9]{64})$/i);
 return match?match[1].toLowerCase():null;
}
function readLink(){
 const token=tokenInAddress();
 if(token){
   localStorage.setItem(LOCAL_KEY,token);
   // Keep the original family link intact so bookmarking and copying the
   // browser address does not silently lose the access token.
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
   const allCorrect=round===63&&q.number===42&&q.answer===null&&q.all_correct===true;
   if((!allCorrect&&(!Number.isInteger(q.answer)||q.answer<1||q.answer>5))||!Number.isInteger(q.points)||q.points<1||q.points>3)throw Error(round+'회 정답·배점 오류');
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
 const [memberToDelete,setMemberToDelete]=useState(null);
 const [deleting,setDeleting]=useState(false);
 const [visibleLink,setVisibleLink]=useState(null);
 const [dialogBusy,setDialogBusy]=useState(false);
 const [activeTab,setActiveTab]=useState('home');
 const [quizCount,setQuizCount]=useState(20);
 const [era,setEra]=useState('전체');
 const [quiz,setQuiz]=useState(null);
 const [reviewOpen,setReviewOpen]=useState(false);
 const [grading,setGrading]=useState(false);
 const [clock,setClock]=useState(Date.now());
 const [image,setImage]=useState('');
 const [imageBusy,setImageBusy]=useState(false);
 const [zoom,setZoom]=useState(false);
 const isAdmin=identity?.role==='admin';

 useEffect(()=>{
   const acceptLink=()=>{
     const fromAddress=tokenInAddress();
     if(!fromAddress)return;
     localStorage.setItem(LOCAL_KEY,fromAddress);
     setToken(old=>{
       if(old===fromAddress)return old;
       setQuiz(null);
       setIdentity(null);
       setError('');
       return fromAddress;
     });
   };
   window.addEventListener('hashchange',acceptLink);
   window.addEventListener('pageshow',acceptLink);
   return ()=>{
     window.removeEventListener('hashchange',acceptLink);
     window.removeEventListener('pageshow',acceptLink);
   };
 },[]);

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
       setActiveTab(id.role==='admin'?'admin':'home');
       try{await refresh(id,token);}
       catch(e){if(active)setError('문제은행·가족 명부를 불러오지 못했어요. 다시 열면 재시도할 수 있습니다.');}
     }catch(e){
       if(active){setError('전용 링크를 확인할 수 없습니다. 중지되었거나 변경된 링크일 수 있어요.');setIdentity(null);}
     }finally{if(active)setBooting(false);}
   })();
   return ()=>{active=false;};
 },[token]);

 const availableEra=useMemo(()=>ERA_ORDER.filter(e=>pool.questions.some(q=>q.era===e)),[pool.questions]);
 const activeMembers=members.filter(x=>x.role!=='admin'&&x.enabled);
 const inactiveMembers=members.filter(x=>x.role!=='admin'&&!x.enabled);
 const wrongRows=records.filter(r=>r.is_correct===false && pool.questions.some(q=>q.exam_round===r.exam_round&&q.number===r.question_number));
 const remaining=quiz?.kind==='test'&&!quiz.finished
   ?Math.max(0,80*60-Math.floor((clock-quiz.startedAt)/1000)):0;
 const formatTimer=(s)=>String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');
 useEffect(()=>{
   if(quiz?.kind!=='test'||quiz.finished)return;
   setClock(Date.now());
   const id=setInterval(()=>setClock(Date.now()),1000);
   return ()=>clearInterval(id);
 },[quiz?.kind,quiz?.startedAt,quiz?.finished]);
 useEffect(()=>{
   if(quiz?.kind==='test'&&!quiz.finished&&!grading&&remaining===0){
     void finishTest(true);
   }
 },[remaining,quiz?.kind,quiz?.finished,grading]);

 const current=quiz?.finished?null:quiz?.questions?.[quiz.index];
 useEffect(()=>{
   if(!current){setImage('');setImageBusy(false);return;}
   let active=true;setImage('');setImageBusy(true);
   familyApi('question',token,{round:current.exam_round,number:current.number})
    .then(r=>{if(active){setImage(r.url);setImageBusy(false);}})
    .catch(()=>{if(active){setImageBusy(false);setError('문제 이미지를 불러오지 못했어요.');}});
   return ()=>{active=false;};
 },[current?.id,token]);

 const tabs=[
   {id:'home',label:'홈',icon:<HomeRounded/>},
   {id:'study',label:'바로 확인',icon:<AutoStoriesRounded/>},
   {id:'test',label:'실전시험',icon:<TimerRounded/>},
   {id:'era',label:'시대별',icon:<HistoryEduRounded/>},
   {id:'wrong',label:'오답 복습',icon:<FactCheckRounded/>},
   ...(isAdmin?[{id:'admin',label:'가족 관리',icon:<ManageAccountsRounded/>}]:[])
 ];
 function navigate(tab){
   if(!tabs.some(t=>t.id===tab))return;
   if(quiz&&!quiz.finished&&!window.confirm('진행 중인 학습을 종료하고 이동할까요?'))return;
   setQuiz(null);
   setActiveTab(tab);
   setError('');
   window.scrollTo(0,0);
 }
 function clearCredential(){
   localStorage.removeItem(LOCAL_KEY);
   if(tokenInAddress()){
     window.history.replaceState(null,'',window.location.pathname+window.location.search);
   }
   setToken('');setIdentity(null);setQuiz(null);setActiveTab('home');
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
 async function deleteMember(){
   if(!memberToDelete||memberToDelete.role==='admin'||deleting)return;
   const target=memberToDelete;
   setDeleting(true);setError('');setNotice('');
   try{
     const result=await familyApi('delete_member',token,{memberId:target.id});
     if(!result.deleted)throw Error('member_delete_not_confirmed');
     await refresh();
     setMemberToDelete(null);
     setNotice(target.nickname+'의 가족 카드와 학습기록을 삭제했어요.');
   }catch(e){
     setError('가족 삭제 실패: '+e.message);
   }finally{
     setDeleting(false);
   }
 }
 async function uploadAll(){
   if(!file||uploading)return;
   if(file.size>50*1024*1024){setError('통합 ZIP 크기는 50MB 이하여야 해요.');return;}
   setUploading(true);setError('');setNotice('');setUploadState('파일 구조 검사 중');
   try{
     const entries=unzipSync(new Uint8Array(await file.arrayBuffer()));
     const names=Object.keys(entries).filter(n=>/^round(6[3-9]|7[0-9]|80)\/manifest\.json$/.test(n)).sort();
     if(!names.length)throw Error('63~80회 통합 ZIP 형식이 아닙니다.');
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
   const wrongKeys=new Set(wrongRows.map(r=>r.exam_round+'-'+String(r.question_number).padStart(2,'0')));
   const candidates=pool.questions.filter(q=>kind==='wrong'?wrongKeys.has(q.id):
     kind==='era'?(era==='전체'||q.era===era):true);
   if(kind==='test'&&candidates.length<50){setError('실전시험을 보려면 50문항 이상 등록되어야 합니다.');return;}
   if(!candidates.length){setError(kind==='wrong'?'복습할 오답이 없습니다.':'선택한 조건에 사용 가능한 문제가 없습니다.');return;}
   const done=new Set(records.map(r=>r.exam_round+'-'+String(r.question_number).padStart(2,'0')));
   const fresh=shuffled(candidates.filter(q=>!done.has(q.id)));
   const reviewed=shuffled(candidates.filter(q=>done.has(q.id)));
   const picked=kind==='wrong'?shuffled(candidates):[...fresh,...reviewed];
   const selected=picked.slice(0,Math.min(kind==='test'?50:quizCount,picked.length));
   setReviewOpen(false);
   setGrading(false);
   setActiveTab(kind==='wrong'?'wrong':kind==='era'?'era':kind==='test'?'test':'study');
   setQuiz({kind,questions:selected,index:0,answers:{},feedback:{},finished:false,
     startedAt:Date.now(),result:null});
   setClock(Date.now());setError('');window.scrollTo(0,0);
 }
 async function pickAnswer(n){
   if(!current||busy||grading||quiz.finished)return;
   if(quiz.kind==='test'){
     setQuiz(prev=>({...prev,answers:{...prev.answers,[current.id]:n}}));
     return;
   }
   if(quiz.answers[current.id])return;
   setBusy(true);setError('');
   try{
     const mode=quiz.kind==='wrong'?'study':quiz.kind;
     const result=await familyApi('save_answer',token,{
       round:current.exam_round,number:current.number,selected:n,mode
     });
     setQuiz(prev=>({...prev,answers:{...prev.answers,[current.id]:n},
       feedback:{...prev.feedback,[current.id]:result}}));
     setRecords(prev=>[
       {exam_round:current.exam_round,question_number:current.number,
        answer_selected:n,is_correct:result.correct,last_mode:mode,answered_at:new Date().toISOString()},
       ...prev.filter(r=>!(r.exam_round===current.exam_round&&r.question_number===current.number))
     ]);
   }catch(e){setError('답안 저장 오류: '+e.message);}
   finally{setBusy(false);}
 }
 async function finishTest(automatic=false){
   if(!quiz||quiz.kind!=='test'||quiz.finished||grading)return;
   const missing=quiz.questions.filter(q=>!quiz.answers[q.id]).length;
   if(!automatic&&missing>0&&!window.confirm('아직 '+missing+'문항을 선택하지 않았어요. 지금 제출할까요?'))return;
   setGrading(true);setError('');
   try{
     const data=await familyApi('grade_test',token,{
       answers:quiz.questions.map(q=>({
         round:q.exam_round,number:q.number,selected:quiz.answers[q.id]??null
       }))
     });
     if(!data.finished||!Array.isArray(data.results))throw Error('채점 결과를 확인할 수 없어요.');
     setQuiz(prev=>prev?.kind==='test'?{...prev,finished:true,result:data}:prev);
     try{
       const newest=await familyApi('records',token);
       setRecords(newest.records||[]);
     }catch{}
   }catch(e){setError('실전시험 제출 실패: '+e.message);}
   finally{setGrading(false);}
 }
 function finishPractice(){
   if(!quiz)return;
   if(quiz.questions.some(q=>!quiz.answers[q.id])&&!window.confirm('아직 풀지 않은 문제가 있어요. 학습을 마칠까요?'))return;
   setQuiz(null);setError('');window.scrollTo(0,0);
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
       {!admin&&item.enabled&&<Button color="error" variant="text" size="small" disabled={busy||deleting} onClick={()=>stopMember(item)}>중지</Button>}
       {!admin&&<Button color="error" variant="outlined" size="small" startIcon={<DeleteOutlineRounded/>} disabled={busy||deleting} onClick={()=>setMemberToDelete(item)}>삭제</Button>}
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
       <Box><Typography variant="h4" sx={{fontSize:{xs:24,md:29}}}>{activeTab==='admin'&&isAdmin?'가족 공부방 관리':'한국사 공부방'}</Typography>
       <Typography color="text.secondary" sx={{fontSize:13,mt:.7}}>{identity.nickname} 님 · 전용 링크 접속 중</Typography></Box>
       <Button size="small" onClick={clearCredential} color="inherit">이 기기 연결 해제</Button>
     </Stack>
   </Box>
   <Paper variant="outlined" sx={{display:{xs:'none',md:'block'},borderRadius:2.5,overflow:'hidden'}}>
     <Tabs variant="scrollable" scrollButtons="auto" value={activeTab} onChange={(_,v)=>navigate(v)}>
       {tabs.map(t=><Tab key={t.id} value={t.id} label={t.label} icon={t.icon} iconPosition="start"
         sx={{minHeight:54,textTransform:'none',fontSize:13,fontWeight:800}}/>)}
     </Tabs>
   </Paper>
   {error&&<Alert severity="warning" onClose={()=>setError('')}>{error}</Alert>}
   {notice&&<Alert severity="success" onClose={()=>setNotice('')}>{notice}</Alert>}

   {isAdmin&&!quiz&&activeTab==='admin'&&<CardPaper>
     <Stack direction={{xs:'column',sm:'row'}} justifyContent="space-between" alignItems={{sm:'center'}} gap={1}>
       <Box><Stack direction="row" alignItems="center" gap={1}><CloudUploadOutlined color="primary"/><Typography variant="h6">① 문제은행 전체 등록</Typography></Stack>
       <Typography fontSize={13} color="text.secondary" sx={{mt:.9}}>기존 73~80회는 그대로 두고 63~72회만 추가할 수 있어요. 학습은 모든 회차를 혼합해 랜덤으로 출제합니다.</Typography></Box>
       <Chip color={pool.total===900?'success':'primary'} label={pool.total+' / 900문항'}/>
     </Stack>
     <LinearProgress variant="determinate" value={Math.min(100,pool.total/900*100)} sx={{height:7,borderRadius:5,mt:2.2,mb:2.4}}/>
     {pool.total===900?<Alert severity="success">문제은행 900문항 등록 완료. 가족별 링크로 바로 학습할 수 있어요.</Alert>:<Stack direction={{xs:'column',sm:'row'}} gap={1.4} alignItems={{sm:'center'}}>
       <Button component="label" variant="outlined" disabled={uploading} startIcon={<CloudUploadOutlined/>}>전체 문제 ZIP 선택<input hidden type="file" accept=".zip,application/zip" onChange={e=>setFile(e.target.files?.[0]||null)}/></Button>
       <Button variant="contained" disabled={!file||uploading} onClick={uploadAll}>전체 등록 시작</Button>
       <Typography fontSize={12} color="text.secondary">{file?file.name:'최초 한 번만 등록 · 등록된 문항은 자동 건너뛰기'}</Typography>
     </Stack>}
     {uploading&&<Stack direction="row" alignItems="center" gap={1.4} sx={{mt:2}}><CircularProgress size={19}/><Typography fontSize={12}>{uploadState}</Typography></Stack>}
   </CardPaper>}

   {isAdmin&&!quiz&&activeTab==='admin'&&<CardPaper>
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

   {!quiz&&activeTab==='home'&&<CardPaper>
     <Stack direction="row" alignItems="center" gap={1} sx={{mb:.8}}>
       <SchoolOutlined color="primary"/><Typography variant="h6">{isAdmin?'③ 학습 모드':'내 공부방'}</Typography>
     </Stack>
     <Typography color="text.secondary" fontSize={13}>관리자가 올린 모든 회차를 한 문제은행으로 사용합니다. 가족별 기록은 독립적으로 저장돼요.</Typography>
     <Grid container spacing={1.4} sx={{mt:1.4,mb:2.5}}>
       {[[pool.total,'등록된 기출'],[records.length,'풀어본 문제'],[wrongRows.length,'복습할 오답']].map(([n,label])=>
         <Grid key={label} size={{xs:4}}><Paper elevation={0} sx={{textAlign:'center',p:{xs:1.2,sm:2},bgcolor:'#f4f7fc'}}>
           <Typography variant="h5" fontWeight={850}>{n}</Typography>
           <Typography fontSize={{xs:11,sm:12}} color="text.secondary">{label}</Typography>
         </Paper></Grid>)}
     </Grid>
     <Stack direction={{xs:'column',sm:'row'}} spacing={1.2} sx={{mb:2}} alignItems={{sm:'center'}}>
       <Typography fontSize={13} fontWeight={800}>문제 수</Typography>
       <Select size="small" value={quizCount} onChange={e=>setQuizCount(Number(e.target.value))}
         sx={{minWidth:145}}>{[10,20,50].map(n=><MenuItem key={n} value={n}>{n}문항</MenuItem>)}</Select>
       <Typography color="text.secondary" fontSize={12}>매번 랜덤 · 미풀이 우선</Typography>
     </Stack>
     <Grid container spacing={1.3}>
       <Grid size={{xs:12,sm:6}}>
         <Paper variant="outlined" sx={{p:2,borderRadius:2.5,height:'100%'}}>
           <Chip label="공부 모드" size="small" color="primary"/>
           <Typography fontWeight={800} sx={{mt:1.1}}>한 문제씩 바로 정답</Typography>
           <Typography color="text.secondary" fontSize={12} sx={{my:1.2}}>답을 누르면 즉시 정답·오답과 정답 번호를 보여줘요.</Typography>
           <Button variant="contained" fullWidth disabled={!pool.total} onClick={()=>startQuiz('study')}>전체 혼합 공부 시작</Button>
         </Paper>
       </Grid>
       <Grid size={{xs:12,sm:6}}>
         <Paper variant="outlined" sx={{p:2,borderRadius:2.5,height:'100%'}}>
           <Chip label="실전 모드" size="small" color="secondary"/>
           <Typography fontWeight={800} sx={{mt:1.1}}>50문항 · 80분 모의시험</Typography>
           <Typography color="text.secondary" fontSize={12} sx={{my:1.2}}>시험 중 정답 비공개. 제출 후 점수·문항별 결과 확인.</Typography>
           <Button variant="outlined" fullWidth disabled={pool.total<50} onClick={()=>startQuiz('test')}>혼합 모의시험 시작</Button>
         </Paper>
       </Grid>
       <Grid size={{xs:12,sm:6}}>
         <Paper variant="outlined" sx={{p:2,borderRadius:2.5,height:'100%'}}>
           <Chip label="시대별" size="small"/>
           <Typography fontWeight={800} sx={{mt:1.1}}>원하는 시대만 집중학습</Typography>
           {availableEra.length?
             <Stack spacing={1} sx={{mt:1.2}}>
               <Select size="small" value={era} onChange={e=>setEra(e.target.value)}>
                 <MenuItem value="전체">전체 시대</MenuItem>
                 {availableEra.map(x=><MenuItem value={x} key={x}>{x}</MenuItem>)}
               </Select>
               <Button fullWidth variant="outlined" onClick={()=>startQuiz('era')}>시대별 문제 시작</Button>
             </Stack>:
             <Alert severity="info" sx={{mt:1.2,fontSize:12}}>시대 분류 검수 중 · 검증한 태그가 등록되면 이용 가능</Alert>}
         </Paper>
       </Grid>
       <Grid size={{xs:12,sm:6}}>
         <Paper variant="outlined" sx={{p:2,borderRadius:2.5,height:'100%'}}>
           <Chip label="오답 복습" size="small" color="warning"/>
           <Typography fontWeight={800} sx={{mt:1.1}}>틀렸던 문제만 다시 풀기</Typography>
           <Typography fontSize={12} color="text.secondary" sx={{my:1.2}}>내 오답 {wrongRows.length}문항. 맞히면 오답 목록에서 빠져요.</Typography>
           <Stack direction="row" gap={1}>
             <Button variant="outlined" disabled={!wrongRows.length} onClick={()=>startQuiz('wrong')}>오답 다시 풀기</Button>
             <Button variant="text" disabled={!wrongRows.length} onClick={()=>setReviewOpen(x=>!x)}>{reviewOpen?'목록 닫기':'오답 목록'}</Button>
           </Stack>
         </Paper>
       </Grid>
     </Grid>
     {reviewOpen&&<Box sx={{mt:2.5}}>
       <Divider sx={{mb:2}}/>
       <Typography variant="h6" sx={{mb:1.5}}>내 오답노트 · {wrongRows.length}문항</Typography>
       {!wrongRows.length?<Alert severity="success">현재 복습할 오답이 없어요.</Alert>:
         <Stack spacing={1}>{wrongRows.map(row=>{
           const q=pool.questions.find(x=>x.exam_round===row.exam_round&&x.number===row.question_number);
           return <Paper key={row.exam_round+'-'+row.question_number} variant="outlined"
             sx={{p:1.6,borderRadius:2,display:'flex',justifyContent:'space-between',alignItems:'center',gap:2}}>
             <Box><Typography fontWeight={750} fontSize={13}>{row.exam_round}회 {row.question_number}번</Typography>
               <Typography fontSize={12} color="text.secondary">내가 선택한 답: {row.answer_selected}번{q?.era?' · '+q.era:''}</Typography></Box>
             <Button size="small" variant="outlined" onClick={()=>{setQuiz({kind:'wrong',questions:[q],index:0,answers:{},feedback:{},finished:false,startedAt:Date.now(),result:null});setReviewOpen(false);window.scrollTo(0,0);}}>다시 풀기</Button>
           </Paper>;
         })}</Stack>}
     </Box>}
     {!pool.total&&<Alert severity="info" sx={{mt:2}}>현재 등록된 문항이 없어요. 관리자가 문제은행을 등록하면 바로 학습할 수 있어요.</Alert>}
     <Alert severity="info" sx={{mt:2,fontSize:12}}>전체 회차를 섞은 모의시험은 실제 단일 회차와 배점 합계가 다를 수 있어요. 공식 등급 판정이 아닌 학습용 점수로 표시합니다.</Alert>
   </CardPaper>}

   {!quiz&&activeTab==='study'&&<CardPaper>
     <Stack direction="row" alignItems="center" gap={1} sx={{mb:1.2}}>
       <AutoStoriesRounded color="primary"/><Typography variant="h6">바로 정답 확인</Typography>
     </Stack>
     <Typography color="text.secondary" fontSize={13} sx={{mb:2}}>
       73~80회 전체 문제은행에서 매번 무작위로 출제해요. 답을 고르면 즉시 정답과 오답을 확인합니다.
     </Typography>
     <Stack direction={{xs:'column',sm:'row'}} spacing={1.5} alignItems={{sm:'center'}} sx={{mb:2}}>
       <Typography fontSize={13} fontWeight={800}>이번에 풀 문항 수</Typography>
       <Select size="small" value={quizCount} onChange={e=>setQuizCount(Number(e.target.value))} sx={{minWidth:130}}>
         {[10,20,50].map(n=><MenuItem value={n} key={n}>{n}문항</MenuItem>)}
       </Select>
     </Stack>
     <Button variant="contained" disabled={!pool.total} onClick={()=>startQuiz('study')}>랜덤 문제 풀기</Button>
   </CardPaper>}
   {!quiz&&activeTab==='test'&&<CardPaper>
     <Stack direction="row" alignItems="center" gap={1} sx={{mb:1.2}}>
       <TimerRounded color="primary"/><Typography variant="h6">실전 모의시험</Typography>
     </Stack>
     <Typography color="text.secondary" fontSize={13} sx={{mb:2}}>
       전체 회차에서 50문항 랜덤 출제 · 제한시간 80분 · 문제를 푸는 동안 정답은 공개되지 않아요.
       제출하면 서버 채점 결과와 오답을 확인할 수 있어요.
     </Typography>
     <Alert severity="info" sx={{mb:2,fontSize:12}}>
       여러 회차의 원래 배점을 섞은 학습용 시험이므로 총점 및 등급은 공식 한능검 결과와 달라질 수 있어요.
     </Alert>
     <Button variant="contained" disabled={pool.total<50} onClick={()=>startQuiz('test')}>50문항 시험 시작</Button>
   </CardPaper>}
   {!quiz&&activeTab==='era'&&<CardPaper>
     <Stack direction="row" alignItems="center" gap={1} sx={{mb:1.2}}>
       <HistoryEduRounded color="primary"/><Typography variant="h6">시대별 집중학습</Typography>
     </Stack>
     <Typography color="text.secondary" fontSize={13} sx={{mb:2}}>
       여러 회차에 걸쳐 해당 시대에 속하는 문제만 모아 랜덤으로 풀어요. 시대는 문항 내용 기준으로 분류합니다. 현재는 1차 검수 분류입니다.
     </Typography>
     {availableEra.length>0?<Stack spacing={1.5}>
       <Select size="small" value={era} onChange={e=>setEra(e.target.value)} sx={{maxWidth:320}}>
         <MenuItem value="전체">전체 시대</MenuItem>
         {availableEra.map(e=><MenuItem value={e} key={e}>{e}</MenuItem>)}
       </Select>
       <Select size="small" value={quizCount} onChange={e=>setQuizCount(Number(e.target.value))} sx={{maxWidth:160}}>
         {[10,20,50].map(n=><MenuItem value={n} key={n}>{n}문항</MenuItem>)}
       </Select>
       <Box><Button variant="contained" onClick={()=>startQuiz('era')}>선택한 시대 공부 시작</Button></Box>
     </Stack>:<Alert severity="info">문항별 시대 분류 검수가 아직 완료되지 않아 선택 가능한 시대가 없습니다. 검증된 태그를 등록한 후 활성화할게요.</Alert>}
   </CardPaper>}
   {!quiz&&activeTab==='wrong'&&<CardPaper>
     <Stack direction="row" alignItems="center" gap={1} sx={{mb:1.2}}>
       <FactCheckRounded color="primary"/><Typography variant="h6">내 오답 복습</Typography>
     </Stack>
     <Typography color="text.secondary" fontSize={13} sx={{mb:2}}>
       내 전용 링크에 저장된 오답 {wrongRows.length}문항. 다시 풀어서 맞히면 목록에서 빠집니다.
     </Typography>
     <Stack direction="row" flexWrap="wrap" gap={1} sx={{mb:2}}>
       <Button variant="contained" disabled={!wrongRows.length} onClick={()=>startQuiz('wrong')}>오답 랜덤 다시 풀기</Button>
       <Button variant="outlined" disabled={!wrongRows.length} onClick={()=>setReviewOpen(v=>!v)}>
         {reviewOpen?'오답 목록 접기':'오답 목록 보기'}
       </Button>
     </Stack>
     {wrongRows.length===0?<Alert severity="success">현재 복습할 오답이 없어요. 공부 모드에서 문제를 풀어보세요.</Alert>:
       reviewOpen&&<Stack spacing={1}>{wrongRows.map(row=>{
         const q=pool.questions.find(p=>p.exam_round===row.exam_round&&p.number===row.question_number);
         if(!q)return null;
         return <Paper key={q.id} variant="outlined" sx={{p:1.5,borderRadius:2}}>
           <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}>
             <Box><Typography fontWeight={800} fontSize={13}>{q.exam_round}회 · {q.number}번</Typography>
               <Typography color="text.secondary" fontSize={12}>내가 선택한 답 {row.answer_selected}번{q.era?' · '+q.era:''}</Typography></Box>
             <Button size="small" variant="outlined" onClick={()=>{
               setQuiz({kind:'wrong',questions:[q],index:0,answers:{},feedback:{},finished:false,startedAt:Date.now(),result:null});
               setReviewOpen(false);window.scrollTo(0,0);
             }}>다시 풀기</Button>
           </Stack>
         </Paper>;
       })}</Stack>}
   </CardPaper>}

   {quiz?.finished&&quiz.result&&<CardPaper>
     <Chip label="시험 제출 완료" color="success" size="small"/>
     <Typography variant="h5" sx={{mt:1.5}}>혼합 모의시험 결과</Typography>
     <Typography variant="h4" color="primary.dark" sx={{mt:1.5}}>{quiz.result.score} / {quiz.result.possiblePoints}점</Typography>
     <Typography color="text.secondary" fontSize={13} sx={{mt:.5}}>정답 {quiz.result.correctCount} / 50 · 답안 작성 {quiz.result.answered} / 50</Typography>
     <Alert severity="info" sx={{mt:2,fontSize:12}}>서로 다른 회차의 문제와 원래 배점을 합산한 참고 점수입니다. 공식 한능검 등급과는 별개예요.</Alert>
     <Typography variant="h6" sx={{mt:3,mb:1}}>문항별 채점 결과</Typography>
     <Grid container spacing={1}>{quiz.result.results.map((r,i)=>
       <Grid size={{xs:6,sm:4,md:3}} key={r.round+'-'+r.number}>
         <Paper variant="outlined" sx={{p:1.6,borderRadius:2,borderLeft:'3px solid '+(r.correct?'#248870':'#cf645f')}}>
           <Typography fontWeight={800} fontSize={13}>{i+1}번 · {r.correct?'정답':'오답'}</Typography>
           <Typography color="text.secondary" fontSize={12}>{r.round}회 {r.number}번</Typography>
           <Typography fontSize={12}>선택 {r.selected??'미응답'} / {r.allCorrect?'전원 정답 처리':`정답 ${r.correctAnswer}`}</Typography>
         </Paper>
       </Grid>)}</Grid>
     <Stack direction="row" gap={1.3} flexWrap="wrap" sx={{mt:3}}>
       <Button variant="contained" onClick={()=>{setQuiz(null);setReviewOpen(false);window.scrollTo(0,0);}}>학습 홈으로</Button>
       <Button variant="outlined" onClick={()=>{setQuiz(null);setReviewOpen(true);window.scrollTo(0,0);}}>오답노트 보기</Button>
     </Stack>
   </CardPaper>}

   {quiz&&!quiz.finished&&current&&<Grid container spacing={2}>
     <Grid size={{xs:12,md:8}}><CardPaper>
       <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
         <Box>
           <Typography variant="h6">{quiz.kind==='test'?'실전 모의시험':quiz.kind==='wrong'?'오답 다시 풀기':quiz.kind==='era'?'시대별 집중학습':'바로 정답 확인'}</Typography>
           <Typography color="text.secondary" fontSize={12}>{quiz.index+1} / {quiz.questions.length}문항 · 전체 회차 문제은행</Typography>
         </Box>
         <Stack direction="row" gap={.8} alignItems="center">
           {quiz.kind==='test'&&<Chip color={remaining<300?'error':'primary'} label={'남은 '+formatTimer(remaining)}/>}
           <Button size="small" color="inherit" onClick={()=>{if(window.confirm('학습을 종료할까요? 제출 전 시험 답안은 저장되지 않습니다.'))setQuiz(null);}}>나가기</Button>
         </Stack>
       </Stack>
       <LinearProgress variant="determinate" value={(quiz.index+1)/quiz.questions.length*100} sx={{height:6,borderRadius:4,my:2}}/>
       <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{mb:1}}>
         <Chip size="small" label={'원본 '+current.exam_round+'회 · '+current.number+'번'}/>
         <Chip size="small" variant="outlined" label={current.points+'점'}/>
       </Stack>
       {imageBusy?<Box sx={{minHeight:270,display:'grid',placeItems:'center'}}><CircularProgress/></Box>:
         image?<Box sx={{textAlign:'center',mb:1.5}}>
           <Box component="img" src={image} alt="기출문제 원문" onClick={()=>setZoom(true)} sx={{maxWidth:'100%',height:'auto',borderRadius:2,border:'1px solid #dee5ef',cursor:'zoom-in'}}/>
           <Button size="small" startIcon={<ZoomInOutlined/>} onClick={()=>setZoom(true)}>문제 확대</Button>
         </Box>:<Alert severity="warning">문제 이미지를 불러오지 못했어요.</Alert>}
       <Typography fontWeight={800} fontSize={13} sx={{my:1.2}}>답안 선택</Typography>
       <Box sx={{display:'grid',gridTemplateColumns:'repeat(5,minmax(0,1fr))',gap:1}}>
         {[1,2,3,4,5].map(n=><Button key={n} variant={quiz.answers[current.id]===n?'contained':'outlined'}
           disabled={busy||grading||(quiz.kind!=='test'&&Boolean(quiz.answers[current.id]))}
           sx={{minWidth:0,minHeight:50,fontSize:17,fontWeight:800}} onClick={()=>pickAnswer(n)}>
           {['①','②','③','④','⑤'][n-1]}
         </Button>)}
       </Box>
       {quiz.kind!=='test'&&quiz.feedback[current.id]&&<Alert sx={{mt:2}} severity={quiz.feedback[current.id].correct?'success':'error'}>
         {quiz.feedback[current.id].correct?'정답이에요!':'아쉬워요, 오답이에요.'} 정답은 {quiz.feedback[current.id].allCorrect?'정답이 없는 정정 문항으로, 응시자 전원 정답 처리됩니다.':`정답은 ${['①','②','③','④','⑤'][quiz.feedback[current.id].correctAnswer-1]}번입니다.`}
       </Alert>}
       <Stack direction="row" justifyContent="space-between" gap={1} sx={{mt:3}}>
         <Button variant="outlined" startIcon={<ArrowBackRounded/>} disabled={quiz.index===0} onClick={()=>setQuiz(q=>({...q,index:q.index-1}))}>이전</Button>
         <Stack direction="row" gap={1}>
           {quiz.kind==='test'&&<Button color="secondary" variant="outlined" disabled={grading} onClick={()=>finishTest(false)}>시험 제출</Button>}
           {quiz.index===quiz.questions.length-1?
             quiz.kind==='test'?<Button variant="contained" disabled={grading} onClick={()=>finishTest(false)}>{grading?'채점 중…':'제출 및 채점'}</Button>:
               <Button variant="contained" onClick={finishPractice}>학습 마치기</Button>:
             <Button variant="contained" endIcon={<ArrowForwardRounded/>} disabled={quiz.kind!=='test'&&!quiz.answers[current.id]}
               onClick={()=>setQuiz(q=>({...q,index:q.index+1}))}>다음</Button>}
         </Stack>
       </Stack>
     </CardPaper></Grid>
     <Grid size={{xs:12,md:4}}><CardPaper sx={{position:{md:'sticky'},top:{md:88}}}>
       <Typography fontWeight={800}>답안지</Typography>
       <Typography fontSize={12} color="text.secondary" sx={{mt:.7,mb:2}}>{Object.keys(quiz.answers).length} / {quiz.questions.length} 선택됨</Typography>
       <Box sx={{display:'grid',gridTemplateColumns:'repeat(5,minmax(0,1fr))',gap:.7}}>
         {quiz.questions.map((q,i)=><Button key={q.id} size="small"
           variant={i===quiz.index?'contained':'outlined'} sx={{minWidth:0,p:0,bgcolor:i!==quiz.index&&quiz.answers[q.id]?'#eff4ff':undefined}}
           onClick={()=>setQuiz(x=>({...x,index:i}))}>{i+1}</Button>)}
       </Box>
       {quiz.kind==='test'&&<Alert severity="info" sx={{mt:2,fontSize:12}}>시험 중 정답은 표시하지 않습니다. 모든 답안은 제출 후 한 번에 채점해요.</Alert>}
     </CardPaper></Grid>
   </Grid>}

   <Dialog open={Boolean(memberToDelete)} onClose={()=>{if(!deleting)setMemberToDelete(null);}} maxWidth="xs" fullWidth>
      <DialogTitle>가족 카드를 영구 삭제할까요?</DialogTitle>
      <DialogContent>
        <Typography sx={{fontWeight:800,mb:1}}>{memberToDelete?.nickname}</Typography>
        <Alert severity="warning">
          이 가족의 전용 링크와 모든 학습기록이 함께 삭제되고 복구할 수 없습니다.
          문제은행에 업로드한 기출문제는 삭제되지 않습니다.
        </Alert>
      </DialogContent>
      <DialogActions sx={{px:3,pb:2.5}}>
        <Button color="inherit" disabled={deleting} onClick={()=>setMemberToDelete(null)}>취소</Button>
        <Button color="error" variant="contained" disabled={deleting} onClick={deleteMember}
          startIcon={<DeleteOutlineRounded/>}>{deleting?'삭제 중…':'영구 삭제'}</Button>
      </DialogActions>
   </Dialog>
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
   <Paper elevation={7} sx={{display:{xs:'block',md:'none'},position:'fixed',zIndex:1200,bottom:0,left:0,right:0,
     borderTop:'1px solid #e0e7f1',pb:'env(safe-area-inset-bottom)',bgcolor:'background.paper'}}>
     <BottomNavigation showLabels value={activeTab} onChange={(_,value)=>navigate(value)} sx={{height:64,px:.5}}>
       {tabs.map(t=><BottomNavigationAction key={t.id} value={t.id} label={t.label} icon={t.icon}
         sx={{minWidth:0,px:0,py:.6,'& .MuiBottomNavigationAction-label':{fontSize:'9px!important',
           lineHeight:1.2,whiteSpace:'nowrap'},'& .MuiSvgIcon-root':{fontSize:21}}}/>)}
     </BottomNavigation>
   </Paper>
   <Box sx={{height:{xs:58,md:0}}}/>
 </Stack>;
}
