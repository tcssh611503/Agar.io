//  //繪製滑鼠座標 滑鼠點擊會有消失Bug xy 變null
// mousePos.set(evt.X,evt.Y) 打錯 xy 是小寫

//-------環境變數----------

//更新速率
var updateFPS = 30;
//滑鼠顯示十字座標
var showMouse = true;
// 全局時間
var time = 0;
//預設背景顏色
var bgColor ="black";

//控制項
var controls = {
  value: 0,
  showId: true,
  showMap: true,
}
var gui = new dat.GUI()
//控制項撰寫範例:控制項名稱 範圍，每次變動0.01，變動時呼叫function
gui.add(controls,"showId")
gui.add(controls,"showMap")

//-------向量class----------
// Vec2

class Vec2{
  constructor(x,y){
    this.x = x
    this.y = y
  }
  set(x,y){
    this.x =x
    this.y =y
  }
  add(v){
    return new Vec2(this.x+v.x,this.y+v.y)
  }
  sub(v){
    return new Vec2(this.x-v.x,this.y-v.y)
  }
  mul(s){
    return new Vec2(this.x*s,this.y*s)
  }
  //改變自己本身的(x,y)
  move(x,y){
    this.x+=x
    this.y+=y
  }
  //複製回傳一個向量
  clone(){
    return new Vec2(this.x,this.y)
  }
  toString(){
    return `(${this.x}, ${this.y})`
  }
  //判斷兩個向量是否相同
  equal(v){
    return this.x==v.x && this.y ==v.y
  }
  
  //使用計算屬性
  //向量長度
  get length(){
    return Math.sqrt(this.x*this.x+this.y*this.y)
  }
  //變更向量長度 nv:new vector
  // a.length =10
  set length(nv){
    let temp = this.unit.mul(nv)
    this.set(temp.x,temp.y)
  }
  
  //向量角度
  get angle(){
    //使用三角函數計算角度
    return Math.atan2(this.y,this.x)  
  }
  //單位向量
  get unit(){
    //a.unit.length = 1
    return this.mul(1/this.length)
  }
  
}


//-----------------------------

//-------1.初始化Canvas設定---------
var canvas = document.getElementById("mycanvas");
var ctx = canvas.getContext("2d");
function initCanvas(){
  ww = canvas.width = window.innerWidth;
  wh = canvas.height = window.innerHeight;
}
initCanvas();

//預設全圓
ctx.circle= function(v,r){
  this.arc(v.x,v.y,r,0,Math.PI*2)
}

ctx.line= function(v1,v2){
  //移動
  this.moveTo(v1.x,v1.y)
  //連線
  this.lineTo(v2.x,v2.y)
}


//-------2.初始化邏輯:遊戲物件與遊戲數值---------

//global class
var global = {
  //整個視野比例
  scale: 1,
  //實際遊戲可以玩的範圍是2000~-2000
  //遊戲寬度
  width: 4000,
  //遊戲高度
  height: 4000,
  //最多食物量
  foodmax: 500,
  //最多玩家量
  playermax: 50,
  //決定能不能合併，1完全隔開，0代表合在一起
  collideFactor: 0
}

//隨機轉移速度
//舊方法
//Math.random()*10-5 (-5~5之間)
//新方法  用新舊比例
//    舊
// ---|------
//            新
//         ----|---------------
//map(Math.random(),0,1,-5,5) (-5~5之間)
//原始值、原始最小值、原始最大值、新最小值、新最大值
function map(value,min,max,nmin,nmax){
  let l1 = max-min
  let l2 = nmax - nmin
  //換算新舊相差比例
  let ratio = l2/l1
  //原始值減掉最小值，再乘上比例+新的最小值
  return (value-min)*ratio+nmin
}

//玩家
class Player{
    constructor(args){
    let def = {
      //*100000 避免重複
      id: parseInt(Math.random()*100000),
      p: new Vec2(0,0),
      //初始速度在5~-5之間
      v: new Vec2(map(Math.random(),0,1,-5,5),map(Math.random(),0,1,-5,5)),
      a: new Vec2(0,0), 
      //重量
      mass: 100,
      //預設活著
      living: true,
      //預設七彩顏色 60%彩度 50%明度
      color: `hsl(${Math.random()*360},60%,50%)`
    }
    Object.assign(def,args)
    Object.assign(this,def)
  }
   
   draw(){
    ctx.fillStyle=this.color
    ctx.beginPath()
    ctx.arc(this.p.x,this.p.y,this.r,0,Math.PI*2)
    ctx.fill()
   //寫出自己的id
    if(this.type!="food" && controls.showId ){
      ctx.font="10px Arial"
      ctx.fillStyle="white"
      ctx.textAlign="center"
      //中心點
      ctx.fillText(parseInt(this.id),this.p.x,this.p.y)   
    }
    //在下方寫出AI正在追的目標id
    if (this.lastTarget && controls.showId){
      ctx.font="10px Arial"
      ctx.fillStyle="azure"
      ctx.textAlign="center"
      ctx.fillText(this.lastTarget.id,this.p.x,this.p.y+20)
    }
     
  }
  update(){
    //移動位置
    this.p.move(this.v.x, this.v.y)
    //21:30先去除加速度
    this.v.move(this.a.x, this.a.y)
    //如果是食物，會越來越慢
    if (this.type=="food"){
      //用物件比較慢
      //this.v = this.v.mul(0.95)
      //比較快
      this.v.x*=0.95
      this.v.y*=0.95
    }
    
    this.a= this.a.mul(0.98)
    //如果重量<0 設定玩家死亡
    if(this.mass<0){
      this.living=false
    }
    //檢查邊界
    this.checkBoundary()
  }
  
  //檢查邊界
  checkBoundary(){
      
    if (this.p.x-this.r<-global.width/2){
      this.p.x = -global.width/2+this.r
    }
    if (this.p.x +this.r> global.width/2){
      this.p.x = global.width/2-this.r
    }
    if (this.p.y-this.r<-global.height/2){
      this.p.y = -global.height/2+this.r
    }
    if (this.p.y+this.r>global.height/2){
      this.p.y = global.height/2-this.r
    }
    
  }
  //eat 41.49
  eat(target){
  //把目標的重量搶過來
    TweenMax.to(this,0.1,{mass: this.mass+target.mass})
  //設定目標已經死了
    target.living=false
    
  }
  get r(){
      return Math.sqrt(this.mass)
  }
  
  //滑鼠控球
  get maxSpeed(){
     // 本身半徑
     // return 1/this.r
     // return 30/this.r
     //次方會小很多，+1避免/0時出錯
     return 30/ (1+Math.log(this.r))
  }
  
  //選擇敵人目標
  isTarget(p){
    //目標的R要是我的0.9倍
    let result = p.r<this.r*0.9 && p.p.sub(this.p).length<500
    return result
  }
}



//遊戲邏輯初始化
//所有的玩家球
players= []
//自己的玩家
myplayers = []
function init(){
  
  //300個玩家
  for(var i =0; i<300; i++ ){
    players.push(new Player({
      //重量在20~1020之間
      mass: Math.random()*1000+20,
      //遊戲畫面負到正的寬度/2
      p: new Vec2(
        map(Math.random(),0,1,-global.width/2,global.width/2),
        map(Math.random(),0,1,-global.height/2,global.height/2),
      )
    }))
  }
  //把第一個當作自己的玩家
 // players[0].mass=500
  myplayers.push(players[0])
  setInterval(function(){
    // let scale = 1/myplayers[0].r
     //縮到合理範圍 ，log不能是0，所以+2
    let scale = 1/Math.log(Math.sqrt(myplayers[0].r)/4+2)
    TweenMax.to(global,2,{scale: scale})
  },2000)
  
  //每隔10毫秒執行 定時加入補新玩家跟食物
  setInterval(function(){
    //增加食物有上限
    if(players.filter(p=>p.type=="food").length<global.foodmax){
      players.push(new Player({
      mass:10,
      p: new Vec2(
          map(Math.random(),0,1,-global.height/2,global.height/2),
          map(Math.random(),0,1,-global.height/2,global.height/2),
        ),
      v: new Vec2(0,0),
      type: "food"
    }))
      
    }
    
    //增加玩家
    if (players.filter(p=>p.type!="food").length<global.playermax){
       players.push(new Player({
        mass: Math.random()*1000+20,
        p: new Vec2(
          map(Math.random(),0,1,-global.height/2,global.height/2),
          map(Math.random(),0,1,-global.height/2,global.height/2),
        ),
      }))
    }
  },10)
}


//-------3.初始化遊戲邏輯更新----------
//更新遊戲邏輯
function update(){
  //可以當作遊戲時間，每秒往上+30
  time++;
  let myplayer = myplayers[0]
  // console.log(global.collideFactor);
  
  players.forEach( (player, pid)=>{
     //如果現在這顆是活著
    if(player.living){
      player.update()
      //非自己玩家-敵人AI模式
      //0.2把目標清掉 20%機率清除目標亂走
      //每0.02秒 判斷不是自己的ID 且不是食物
      //time+pid*5，讓每個敵人的變化更新時間錯開
      if( (time+pid*5)%20==0 && player.id!=myplayer.id  && player.type!="food" ){
        //自動去執行
        if (Math.random()<0.2){
          //隨機移動時，清掉選定的敵人
          player.lastTarget=null
          //隨機指定一個角度的最大速度，去追人
          let angle = Math.PI*2*Math.random()
          let len = player.maxSpeed
          // player.speed = new Vec2(Math.cos(angle)*len,Math.sin(angle)*len)
          let newV = new Vec2(Math.cos(angle)*len,Math.sin(angle)*len)
          TweenMax.to(player.v,0.1, newV)
        }
        
        //30%機率選定敵人//0.3選新目標
        if (Math.random()<0.3){
          let targets = players.filter(t=>player.isTarget(t))
        //       .sort((p1,p2)=>p2.mass-p1.mass).slice(0,5)
          //其他自動吃小圓
        //   if ( player.type!='food' && player!=myplayer){
            if (targets[0]){
        //         let delta = targets[0].p.sub(player.p)
        //         let mm = delta.unit.mul(targets[0].maxSpeed/2)
        //         TweenMax.to(player.v,0.4,{x: mm.x,y: mm.y,ease: Cubic.easeOut})
                player.lastTarget = targets[0]
            }
        //   }
        //0.5 追
        }else{
          //去追自己紀錄的目標
          if (player.lastTarget && player.lastTarget.living){
            //目標的球會相對於自己的向量是什麼
            let delta = player.lastTarget.p.sub(player.p)
            let newV = delta.unit.mul(player.maxSpeed)
            TweenMax.to(player.v,0.2,{x: newV.x,y: newV.y})
          }
          
        }
        
        
      }
      

      //抓第二層
      //球兩兩比對，判斷有沒有被吃
      players.forEach( (player2 , pid2 ) =>{
        if(pid!=pid2 && player.id != player2.id && player2.living){
          // player.p.sub(player2.p).length -10 在邊界時能吃掉旁邊的，避免太嚴格
          if(player.r*0.9>player2.r && player.p.sub(player2.p).length -10 <= (player.r-player2.r)   ){
            
             if(player.id==myplayer.id){
                // 太常印log容易lag
                // console.log("collide")
                player.eat(player2)
             }
            
          }
        }
        
      })
      
    }
    
 
    })
  
  //把分裂的排開
    myplayers.forEach( (c1,c1id)=>{
      myplayers.forEach( (c2,c2id)=>{
//         //只對不同配對做檢查，且都活著
        if (c1id!= c2id && c1.living && c2.living){
          //讓球彼此聚集
          let delta = c2.p.sub(c1.p)
          if (delta.length<c1.r+c2.r){
            let pan = delta.unit.mul( (c1.r+c2.r )*global.collideFactor)
            //還原為原本位置
            c2.p=c1.p.add(pan)
            c2.v=c1.v.clone()
          }

          //互吃合併（記得不要吃掉自己的0)
          delta = c2.p.sub(c1.p)
          if (global.collideFactor<0.7   && delta.length< (c1.r+c2.r)*0.6 && c2id!=0 ){
            //重量相加
            c1.mass+=c2.mass
            //讓合併時不要太突兀，更新成兩球中心
            c1.p = c1.p.add(c2.p).mul(0.5 )
            c2.living=false
            // console.log(`${c1.id}(${c1.mass}) eat ${c2.id}(${c2.mass})`)

          }
        }
      })
  })
  
  
  //分裂跟著球跑
    myplayers.forEach( (c1,c1id)=>{
      if(c1id!=0){
        
        let mdelta = myplayer.p.sub(c1.p)
        //換算 0~100 到0~20
        c1.p=c1.p.add(mdelta.unit.mul(map(mdelta.length,0,100,0,20)/Math.sqrt(c1.r)))
        let delta = mousePos.sub(new Vec2(ww/2,wh/2)).mul(0.1)
        //移動速度大於最大速度
        if (delta.length>c1.maxSpeed){
          delta=delta.unit.mul(c1.maxSpeed)
        }
        c1.v =delta
        c1.v =c1.v.add(c1.a)
      }
      
  })
  
  
  
  //球兩兩比對，判斷有沒有被吃
  let delta = mousePos.sub(new Vec2(ww/2,wh/2)).mul(0.1)
  let deltaLen = delta.length
  //如果deltaLen>本身速度
  if(deltaLen>myplayer.maxSpeed){
    delta = delta.unit.mul(myplayer.maxSpeed)
  }
  myplayer.v=delta
  
  
  
  
  //把死掉的篩掉
  players = players.filter(p=>p.living)
  myplayers = myplayers.filter(p=>p.living)
  
  //如果自己被吃掉
  if(myplayers.length==0){
    //推一個players進去
     myplayers.push(players.filter(p=>p.type!="food")[0] )
    
  }
  
}




//-------4.初始化遊戲畫面繪製----------
//繪製畫面，也可以稱為render
function draw(){
   //清空背景
  ctx.fillStyle=bgColor
  // 填滿背景
  ctx.fillRect(0,0,ww,wh)
  
  //-------------------------
  //   在這裡繪製
  
  //玩家是中心點
  let cen = myplayers[0].p;
  
   ctx.save()
   ctx.translate(ww/2,wh/2)
   //球的大小倍數
   ctx.scale(global.scale, global.scale)
   // ctx.scale(0.5,0.5)
  //讓玩家自己在畫面正中央
   ctx.translate(-cen.x,-cen.y)
  //重新繪製  ctx.beginPath(20210422-0443
   ctx.beginPath()
  
  //繪製網格
  //改成4000能整除的
  let gridWidth = 250;
  let gcount = global.width/gridWidth
  
  for(var i=-gcount/2;i<=gcount/2;i++){
      //直向
      ctx.moveTo(i*gridWidth,-global.height/2)
      ctx.lineTo(i*gridWidth,global.height/2)
      //橫向
      ctx.moveTo(-global.width/2,i*gridWidth)
      ctx.lineTo(global.width/2,i*gridWidth)
  }
  ctx.strokeStyle="rgba(255,255,255,0.4)"
  ctx.stroke()
  
    //排序 slice().sort((p1,p2)=>p1.r-p2.r) 吃掉時，看起來會在下方
    players.slice().sort((p1,p2)=>p1.r-p2.r).forEach(player=>{
      //如果活著才畫
      if(player.living){
        player.draw()
      }
      
    })
  ctx.restore()
  
  //繪製分數
  ctx.font="20px Arial"
  ctx.fillStyle="white"
  //總成績 ruduce 初始值為0
  let score = myplayers.map(p=>p.mass).reduce((total,mass)=>{return total+mass},0 )
  ctx.fillText("Score: "+parseInt(score),30,30)
  //global
  ctx.fillText("collide: "+global.collideFactor,30,60)
  ctx.fillText("Shooting: W ; Divides: Space ",30,90)
  
  
  
  //未教學，小地圖
    if (controls.showMap){
      //小地圖
    ctx.save()
    ctx.translate(0,wh)
    ctx.scale(1/30,1/30)
    ctx.translate(0,-global.height)
    ctx.fillStyle="rgba(255,255,255,0.2)"
    ctx.fillRect(0,0,global.width,global.height)
    ctx.translate(global.width/2,global.height/2)
    // console.log(players.length)

    players.forEach(player=>{
      if (player.type!="food"){

        ctx.beginPath()
        ctx.fillStyle="white"
        let r = 20
        if (myplayers.map(mp=>mp.id).indexOf(player.id)!=-1){
          ctx.fillStyle="red"
          r=100
        }
        ctx.arc(player.p.x,player.p.y,r,0,Math.PI*2)
        ctx.fill()
      }
    })


    ctx.restore()
  }
  
  
  //-----------------------
  //繪製滑鼠座標
  ctx.fillStyle="red"
  ctx.beginPath()
  //滑鼠點
  ctx.circle(mousePos,2)
  ctx.fill()
  
  ctx.save()
  ctx.beginPath()
  ctx.translate(mousePos.x,mousePos.y)
    ctx.strokeStyle="red"
    let len = 20
    ctx.line(new Vec2(-len,0),new Vec2(len,0))
    //標示座標
    ctx.fillText(mousePos,10,-10)
    //寫法一使用旋轉
    ctx.rotate(Math.PI/2)
    ctx.line(new Vec2(-len,0),new Vec2(len,0))
    //寫法二
    // ctx.line(new Vec2(0,-len),new Vec2(0,len))
    ctx.stroke()
  ctx.restore()
  
  //schedule next render 預定下一次執行
  requestAnimationFrame(draw);
}

//-------頁面載入----------
//頁面載入完成後依序載入
function loaded(){
  initCanvas()
  init()
  //快速執行
  requestAnimationFrame(draw)
  //每隔1秒執行30次更新
  setInterval(update,1000/updateFPS)
}


//載入，頁面載入完成後才執行
window.addEventListener("load",loaded)
//縮放，瀏覽器視窗大小改變時resize
window.addEventListener("resize",initCanvas)



//-------滑鼠事件跟紀錄----------
//滑鼠紀錄位置
var mousePos = new Vec2(0,0)
var mousePosDown = new Vec2(0,0)
var mousePosUp = new Vec2(0,0)

//滑鼠事件
window.addEventListener("mousemove",mousemove)
window.addEventListener("mouseup",mouseup)
window.addEventListener("mousedown",mousedown)

function mousemove(evt){
  mousePos.set(evt.x,evt.y)
  //顯示目前滑鼠位置
  // console.log(mousePos)
}
function mouseup(evt){
  // mousePos.set(evt.offsetX,evt.offsetY)
  mousePos.set(evt.x,evt.y)
  mousePosUp = mousePos.clone()
}
function mousedown(evt){
  // mousePos.set(evt.offsetX,evt.offsetY)
  mousePos.set(evt.x,evt.y)
  mousePosDown = mousePos.clone()
}





//監聽鍵盤按鍵
window.addEventListener('keydown',function(evt){
  //監聽鍵盤按鍵
  // console.log(evt.key)
//空白鍵 分裂事件
 if (evt.key==" "){
   let newballs = []
   //不能合併 0才能合併
   global.collideFactor=1
   //如果有的話清除
   if (global.splitTimer){
     clearTimeout(global.splitTimer)
   }
   //刪掉TweenMax
   TweenMax.killTweensOf(global)
   //分裂計時器  8秒後歸零
   global.splitTimer = setTimeout(()=>{
     TweenMax.to(global,10,{collideFactor: 0})
   },8000)
   //抓出所有玩家
   myplayers.forEach(mp=>{
     if (mp.mass>400){

       TweenMax.to(mp,0.2,{mass: mp.mass/2})
       //分裂
       let splitSelf =  new Player({
         //id要相同才能避免誤時
          id: mp.id,
          mass: mp.mass/2,
          p: mp.p.clone(),
          v: mousePos.sub(new Vec2(ww/2,wh/2)).unit.mul(mp.maxSpeed*3),
          a: mousePos.sub(new Vec2(ww/2,wh/2)).unit.mul(mp.maxSpeed*3),
          color: mp.color,
        })
//        // TweenMax.to(splitSelf.p,0.3,{ㄊ
//        //   x: mp.x,
//        //   y: mp.y
//        // })
       newballs.push(splitSelf)
     }
   })

   players = players.concat(newballs)
   myplayers = myplayers.concat(newballs)
 }
  //w射出食物
  if (evt.key=="w"){
    //把所有的players抓出來
    myplayers.forEach(mp=>{
      
      //至少要200才射
      if (mp.mass>200){
        //射出80 消耗100
        TweenMax.to(mp,0.2,{mass:mp.mass-100})
        //滑鼠和自己的差
        let mouseDelta = mousePos.sub(new Vec2(ww/2,wh/2))
        let mouseAngle = mouseDelta.angle
        //往哪個方向射
        //初始半徑
        let initR = mp.r+10
        //現在位置
        let initPosition = mp.p.add( new Vec2(initR*Math.cos(mouseAngle),initR*Math.sin(mouseAngle)))
        //食物參數
        let args = {
          //改成初始位置才能發射
          // p: mp.p,
          p: initPosition,
          //自己速度的1.5倍+滑鼠方向
          v: mp.v.mul(1.5).add(mouseDelta.unit.mul(Math.random()*5+10)),
          mass: 80,
          color: mp.color,
          type: "food"
        }
        // console.log(args)
        players.push(new Player(args))

      }
    })
  }
})