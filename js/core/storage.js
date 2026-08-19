// localStorage を window.storage 相当の非同期API(get/set/delete)として薄くラップしたもの。
// クッキークリッカー同様、同じブラウザで再訪した際にセーブデータを引き継げるようにするための永続化層。
// プライベートブラウジング等でlocalStorageへのアクセスが例外を投げる環境でも起動を壊さないようtry/catchする。
export const storage = {
  async get(key){
    try{
      const v = localStorage.getItem(key);
      return v===null ? null : {value:v};
    }catch(e){ return null; }
  },
  async set(key, value){
    try{ localStorage.setItem(key, value); }catch(e){}
  },
  async delete(key){
    try{ localStorage.removeItem(key); }catch(e){}
  },
};
