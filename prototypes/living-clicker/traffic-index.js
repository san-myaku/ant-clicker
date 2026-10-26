// Embedded inside the generated core factory; W/H are the world's bounds.
// Buckets only reduce candidates. move() keeps every original traffic rule.
  class AntTrafficIndex{
    constructor(ants,width=3){
      this.ants=ants;this.count=ants.length;this.width=width;
      this.columns=Math.ceil(W/width);this.rows=Math.ceil(H/width);
      this.buckets=new Map();this.nodes=new Map();this.byId=new Map();
      ants.forEach((ant,order)=>{
        const node={ant,order,cell:this.cell(ant)};this.nodes.set(ant,node);this.byId.set(ant.id,ant);
        if(!this.buckets.has(node.cell))this.buckets.set(node.cell,new Set());this.buckets.get(node.cell).add(node);
      });
    }
    cell(p){return Math.floor(p.y/this.width)*this.columns+Math.floor(p.x/this.width);}
    update(ant){
      const node=this.nodes.get(ant);if(!node)return; // Intruders are not friendly traffic candidates.
      const cell=this.cell(ant);if(cell===node.cell)return;
      const old=this.buckets.get(node.cell);old.delete(node);if(!old.size)this.buckets.delete(node.cell);
      if(!this.buckets.has(cell))this.buckets.set(cell,new Set());this.buckets.get(cell).add(node);node.cell=cell;
    }
    query(p,radius=2.6){
      const nodes=[];
      const minX=Math.max(0,Math.floor((p.x-radius)/this.width)),maxX=Math.min(this.columns-1,Math.floor((p.x+radius)/this.width));
      const minY=Math.max(0,Math.floor((p.y-radius)/this.width)),maxY=Math.min(this.rows-1,Math.floor((p.y+radius)/this.width));
      for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){
        const bucket=this.buckets.get(y*this.columns+x);if(bucket)for(const node of bucket)nodes.push(node);
      }
      // The first eligible worker in the original array wins, even after an
      // ID was reused or a worker changed bucket during this same step.
      nodes.sort((a,b)=>a.order-b.order);return nodes.map(node=>node.ant);
    }
  }
