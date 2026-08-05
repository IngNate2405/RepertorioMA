import { collection, doc, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db } from './config'
import type { Setlist } from '../types'

const setlistsCol = collection(db, 'setlists')

export function listenSetlists(callback: (setlists: Setlist[]) => void) {
  const q = query(setlistsCol, orderBy('date', 'desc'))
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Setlist))
  })
}

export function listenSetlist(setlistId: string, callback: (setlist: Setlist | null) => void) {
  return onSnapshot(doc(db, 'setlists', setlistId), snap => {
    callback(snap.exists() ? ({ id: snap.id, ...snap.data() } as Setlist) : null)
  })
}
