export class Dice{
    faces: number
    times: number
    result: number[] = []
    sum:number
    constructor(times:number,faces:number){
        this.faces = faces
        this.times = times
        this.roll()
    }
    roll(){
        this.sum = 0
        for(let i=0;i<this.times;i++){
            this.result[i] = Math.floor(Math.random()*this.faces+1)
            this.sum += this.result[i]
        }
    }
}
