import { describe, expect, it } from 'vitest'
import { getLine } from './transitNetwork.ts'
import {
  findNextTrain,
  remainingOnPath,
  shouldNotifyOneStop,
  shortestPath,
  type Arrival,
} from './trainMatcher.ts'

const line2 = getLine('1002')!

describe('shortestPath', () => {
  it('finds the next station on a normal route', () => {
    expect(shortestPath(line2, '강남', '잠실').slice(0, 3)).toEqual([
      '강남',
      '역삼',
      '선릉',
    ])
  })

  it('chooses the shorter direction around the circular line', () => {
    expect(shortestPath(line2, '시청', '을지로입구')).toEqual([
      '시청',
      '을지로입구',
    ])
  })
})

describe('remainingOnPath', () => {
  it('counts stations left until the destination', () => {
    const path = shortestPath(line2, '강남', '잠실')
    expect(remainingOnPath(path, '강남')).toBe(path.length - 1)
    expect(remainingOnPath(path, '종합운동장')).toBe(2)
    expect(remainingOnPath(path, '잠실새내')).toBe(1)
    expect(remainingOnPath(path, '잠실')).toBe(0)
  })

  it('returns null when the train is not on the trip path yet', () => {
    const path = shortestPath(line2, '강남', '잠실')
    expect(remainingOnPath(path, '홍대입구')).toBeNull()
  })
})

describe('shouldNotifyOneStop', () => {
  it('notifies only once when one station remains', () => {
    const path = shortestPath(line2, '강남', '잠실')
    expect(shouldNotifyOneStop(false, path, '잠실새내')).toBe(true)
    expect(shouldNotifyOneStop(true, path, '잠실새내')).toBe(false)
    expect(shouldNotifyOneStop(false, path, '종합운동장')).toBe(false)
  })
})

describe('findNextTrain', () => {
  it('selects the earliest train moving toward the destination', () => {
    const arrivals: Arrival[] = [
      {
        subwayId: '1002',
        btrainNo: 'wrong-direction',
        trainLineNm: '성수행 - 교대방면',
        barvlDt: '20',
      },
      {
        subwayId: '1002',
        btrainNo: 'later',
        trainLineNm: '성수행 - 역삼방면',
        barvlDt: '180',
      },
      {
        subwayId: '1002',
        btrainNo: 'next',
        trainLineNm: '성수행 - 역삼방면',
        barvlDt: '60',
      },
    ]

    expect(findNextTrain(arrivals, line2, '강남', '잠실')?.btrainNo).toBe(
      'next',
    )
  })

  it('ignores arrivals from another line at transfer stations', () => {
    const arrivals: Arrival[] = [
      {
        subwayId: '1007',
        btrainNo: 'line-seven',
        trainLineNm: '장암행 - 어린이대공원방면',
        barvlDt: '10',
      },
      {
        subwayId: '1002',
        btrainNo: 'line-two',
        trainLineNm: '성수행 - 성수방면',
        barvlDt: '100',
      },
    ]

    expect(
      findNextTrain(arrivals, line2, '건대입구', '뚝섬')?.btrainNo,
    ).toBe('line-two')
  })
})
