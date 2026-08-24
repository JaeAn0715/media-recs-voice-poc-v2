import { describe, expect, it } from 'vitest'
import { getLine } from '../data/transitNetwork'
import { findNextTrain, shortestPath, type Arrival } from './trainMatcher'

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
