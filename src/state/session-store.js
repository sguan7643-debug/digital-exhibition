import { reactive } from 'vue';
import { FAVORITE_FIXTURES } from './content-controllers.js';
import { APP_FIXTURES } from '../fixtures/mock-data.js';

const clone=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
const SESSION_FIELDS=['queryDraft','filters','draft','page','pageSize','sort','view'];

export function createSessionStore(initialFavorites=[],favoriteMappings=[]){
  const controllers=new Map();
  const snapshots=new Map();
  const favorites=reactive(new Set(initialFavorites));
  const favoriteRoutes=new Map(favoriteMappings);
  let entryCounter=0;
  return {
    favorites,
    favoriteRoutes,
    controller(key,factory){if(!controllers.has(key))controllers.set(key,factory());return controllers.get(key);},
    nextEntryKey(){entryCounter+=1;return `xlt-entry-${entryCounter}`;},
    capture(key,value){snapshots.set(key,{...clone(value),scrollTop:Number(value?.scrollTop)||0,focusId:String(value?.focusId||'')});},
    snapshot(key){const value=snapshots.get(key);return value?clone(value):null;},
    captureViewState(){const state={};for(const [key,controller] of controllers){const value={};for(const field of SESSION_FIELDS)if(field in controller)value[field]=clone(controller[field]);if(Object.keys(value).length)state[key]=value;}return state;},
    restoreViewState(state={}){for(const [key,value] of Object.entries(state)){const controller=controllers.get(key);if(!controller)continue;for(const [field,next] of Object.entries(value)){if(controller[field]&&typeof controller[field]==='object'&&!Array.isArray(controller[field]))Object.assign(controller[field],clone(next));else controller[field]=clone(next);}}},
    registerFavorite(id,route){favoriteRoutes.set(id,route);},
    isFavoriteId(id){return favorites.has(id);},
    isRouteFavorite(route){for(const id of favorites)if(favoriteRoutes.get(id)===route)return true;return false;},
    setFavoriteId(id,value){value?favorites.add(id):favorites.delete(id);},
    toggleFavoriteId(id){favorites.has(id)?favorites.delete(id):favorites.add(id);return favorites.has(id);},
    setRouteFavorite(route,value){const ids=[...favoriteRoutes].filter(([,itemRoute])=>itemRoute===route).map(([id])=>id);if(value){const canonical=ids[0];if(canonical)favorites.add(canonical);}else ids.forEach(id=>favorites.delete(id));return this.isRouteFavorite(route);},
    toggleRouteFavorite(route){return this.setRouteFavorite(route,!this.isRouteFavorite(route));},
    setFavorite(key,value){this.setFavoriteId(key,value);},
    toggleFavorite(key){return this.toggleFavoriteId(key);}
  };
}

const favoriteMappings=[...FAVORITE_FIXTURES.map(item=>[item.id,item.route]),...APP_FIXTURES.map(item=>[item.id,item.route])];
export const routeSession=createSessionStore(FAVORITE_FIXTURES.map(item=>item.id),favoriteMappings);
