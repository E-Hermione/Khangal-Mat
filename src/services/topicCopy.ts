import { collection, doc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { getDb } from './firebase';
import { storageService } from './storageService';
import { loadMaterials, materialBlob, uploadMaterial } from './topicMaterials';
import { GradeNumber, TopicPackage } from '../types';

/**
 * Copies a topic and its subtopics into another grade as new, separate topics: the lesson, its
 * answers, extra materials and drills. Each grade can then change its copy without touching the other.
 * `ids` lists the topic first, then its subtopics (parents before their children).
 */
export async function copyTopicGroup(ids: string[], grade: GradeNumber, onStep?: (text: string) => void): Promise<string> {
  const stamp = Date.now().toString(36);
  const idMap = new Map(ids.map((id, i) => [id, `g${grade}-${stamp}${i.toString(36)}${Math.random().toString(36).slice(2, 5)}`]));
  const remap = (s: string) => [...idMap].reduce((acc, [from, to]) => acc.split(from).join(to), s);
  for (const id of ids) {
    const topic = storageService.getTopicById(id);
    if (!topic) continue;
    const newId = idMap.get(id)!;
    onStep?.(topic.title);
    const copy: TopicPackage = JSON.parse(remap(JSON.stringify(topic)));
    copy.grade = grade;
    delete copy.visibleGrades;
    storageService.saveTopic(copy);
    // extra materials (PDF files)
    for (const m of await loadMaterials(id).catch(() => [])) {
      const blob = await materialBlob(m);
      await uploadMaterial(newId, new File([blob], m.name, { type: 'application/pdf' }));
    }
    // drills
    const drills = await getDocs(query(collection(getDb(), 'topicDrills'), where('topicId', '==', id))).catch(() => null);
    for (const d of drills?.docs || []) {
      const part = d.id.split('__').pop();
      await setDoc(doc(getDb(), 'topicDrills', `${newId}__${part}`), { ...d.data(), topicId: newId });
    }
  }
  return idMap.get(ids[0])!;
}
