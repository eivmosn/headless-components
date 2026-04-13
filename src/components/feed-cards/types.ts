export interface FeedCard {
  type: 'video' | 'docs'
  title: string
  cover?: string
  duration?: string
  description?: string
  category?: string
  views: number
  comments: number
  userName: string
  createTime: string
  profile?: string
  profileName?: string
}

export type FeedCards = Array<FeedCard>
