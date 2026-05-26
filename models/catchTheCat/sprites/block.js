export default class Block {
  constructor (i, j) {
    this.i = i
    this.j = j
    this.isWall = false
  }

  get isWall () {
    return this._isWall
  }

  set isWall (value) {
    this._isWall = value
  }

  setWall (avatarUrl) {
    this._isWall = !!avatarUrl
    this.avatarUrl = typeof avatarUrl === 'string' ? avatarUrl : ''
  }
}
