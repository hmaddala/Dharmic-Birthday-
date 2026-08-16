const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// The problematic block in src/App.tsx:
//              </div>
//          </>)}
//          </form>
//          </div>
//                              {(hasAllFourDetails && (!requireApproval || acceptedBlueprint)) && (<div className="p-4 lg:p-6 border-t border-[#e2d1b3] bg-[#fdfcfb]">

// We will replace it with a clean version.

const oldStr = `              </div>
          </>)}
          </form>
          </div>
                              {(hasAllFourDetails && (!requireApproval || acceptedBlueprint)) && (<div className="p-4 lg:p-6 border-t border-[#e2d1b3] bg-[#fdfcfb]">`;

const newStr = `              </div>
          </form>
          </div>
          <div className="p-4 lg:p-6 border-t border-[#e2d1b3] bg-[#fdfcfb]">`;

content = content.replace(oldStr, newStr);

// Also there's a trailing )} from the removed condition wrapping the submit block:
//             )}
//          </div>)}
//        </section>

const oldStr2 = `             )}
          </div>)}
        </section>`;

const newStr2 = `             )}
          </div>
        </section>`;

content = content.replace(oldStr2, newStr2);

fs.writeFileSync('src/App.tsx', content);
