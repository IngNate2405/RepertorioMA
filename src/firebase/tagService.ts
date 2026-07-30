import { doc, onSnapshot } from 'firebase/firestore'
import { db } from './config'
import type { Tag } from '../types'

export function listenTags(callback: (tags: Tag[]) => void) {
  return onSnapshot(doc(db, 'tags', 'list'), snap => {
    callback(snap.exists() ? (snap.data().items as Tag[]) : [])
  })
}
