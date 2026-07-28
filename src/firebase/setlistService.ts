import { collection, doc, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore'
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

/** El setlist marcado como "current" — lo que ve el usuario en el Inicio. */
export function listenCurrentSetlist(callback: (setlist: Setlist | null) => void) {
  const q = query(setlistsCol, where('status', '==', 'current'), limit(1))
  return onSnapshot(q, snap => {
    callback(snap.empty ? null : ({ id: snap.docs[0].id, ...snap.docs[0].data() } as Setlist))
  })
}

/** Fallback para el Inicio cuando no hay ningún setlist "current". */
export function listenLastPlayedSetlist(callback: (setlist: Setlist | null) => void) {
  const q = query(setlistsCol, where('status', '==', 'played'), orderBy('playedAt', 'desc'), limit(1))
  return onSnapshot(q, snap => {
    callback(snap.empty ? null : ({ id: snap.docs[0].id, ...snap.docs[0].data() } as Setlist))
  })
}
