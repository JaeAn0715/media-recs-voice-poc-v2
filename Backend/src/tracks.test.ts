import { describe, expect, it } from 'vitest'
import { getLine } from '../../shared/transitNetwork.ts'
import { remainingOnPath, shortestPath, shouldNotifyOneStop } from '../../shared/trainMatcher.ts'

const line2 = getLine('1002')!

describe('one-stop remaining path', () => {
  it('treats 잠실새내 as one station before 잠실 on line 2', () => {
    const path = shortestPath(line2, '강남', '잠실')
    expect(path.at(-2)).toBe('잠실새내')
    expect(remainingOnPath(path, '잠실새내')).toBe(1)
    expect(shouldNotifyOneStop(false, path, '잠실새내')).toBe(true)
  })
})
