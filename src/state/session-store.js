import { reactive } from 'vue';

export function createSessionStore(initialFavorites=[]){
  const controllers=new Map();
  const snapshots=new Map();
  const favorites=reactive(new Set(initialFavorites));
  return {
    favorites,
    controller(key,factory){if(!controllers.has(key))controllers.set(key,factory());return controllers.get(key);},
    capture(key,value){snapshots.set(key,{scrollTop:Number(value?.scrollTop)||0,focusId:String(value?.focusId||'')});},
    snapshot(key){const value=snapshots.get(key);return value?{...value}:null;},
    setFavorite(key,value){value?favorites.add(key):favorites.delete(key);},
    toggleFavorite(key){favorites.has(key)?favorites.delete(key):favorites.add(key);return favorites.has(key);}
  };
}

export const routeSession=createSessionStore([
  '/apps/report-001','/apps/dataset-001','/apps/rpa-001','/apps/ead-001','/apps/ai-001'
]);
