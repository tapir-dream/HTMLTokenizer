(function () {
	var HTMLTokeEnum = HTMLTokenizer.HTMLTokeEnum;
	
	function print(a, b) {
    return a.replace(/#\{(.+?)\}/ig, function() {
      var a = arguments[1].replace(/\s/ig, ""), c = arguments[0], d = a.split("||");
      for (var e = 0, f = d.length; e < f; e += 1) {
          if (/^default:.*$/.test(d[e])) {
              c = d[e].replace(/^default:/, "");
              break;
          }
          if (b[d[e]] !== undefined) {
              c = b[d[e]];
              break;
          }
      }
      return c;
    });
  }

	function subText(tdl, start) {
		if (!tdl || !tdl.length) return '';
		var c = tdl.length;
		var txt = '';
		for (var i = start + 1; i < c; ++i) {
			var data = tdl[i];
			var token = data.token;
			var value = data.value;
			if (token != HTMLTokeEnum.Character) {
				break;
			} 
			txt += value;
		}
		return txt;
	}

	function innerText(tdl, start, tagName) {
		if (!tdl || !tdl.length) return '';
		var c = tdl.length;
		for (var i = start; i < c; ++i) {
			var data = tdl[i];
			var token = data.token;
			var value = data.value;
			if (token === HTMLTokeEnum.EndTag && value === tagName) {
				break;
			}
		}
		var arr = tdl.slice(start, i);
		var txt = '';
		
		for (var j = 0, c = arr.length; j < c; ++j) {
			var data = arr[j];
			var token = data.token;
			var value = data.value;
			if (token != HTMLTokeEnum.Character) {
				continue;
			}
			txt += value;
		}
		return {txt:txt, i:i};
	}
	
	function getAttr(tdl, idx, attrName) {
		if (!idx) return '';
		if (!tdl || !tdl.length) return '';
		var attr = tdl[idx].attributes;
		var c = attr.length;
		if (!attr || !c) return '';
		for (var i = 0; i < c; ++i) {
			if (attr[i].name === attrName) {
				return attr[i].value;
			}
		}
		return false;
	}
	
	return function(tdl) {
		if (!tdl || !tdl.length) return '';
		var md = [];
		var c = tdl.length;
		var closeTagMap = {
			em: {s:'*', e: '*'},
			i: {s:'*', e: '*'},
			b: {s:'**', e: '**'},
			strong: {s:'**', e: '**'},
			s: {s:'~~', e: '~~'},
			del: {s:'~~', e: '~~'},
			strike: {s:'~~', e: '~~'},
			h1: {s:'\n# ', e: ' #\n'},
			h2: {s:'\n## ', e: ' ##\n'}
		};
		var noCloseTagMap = {
			hr: '\n --- \n',
			p: '\n',
			br: '\n',
			div: '\n\n'
		};
		var listFlag = [];
		var listIndex = 1;
		var blockquoteFlag = false;
		for (var i = 0; i < c; ++i) {
			var data = tdl[i];
			if (!data) continue;
			var token = data.token;
			var value = data.value;
			if (token === HTMLTokeEnum.Character) {
				var tmpTxt = data.value;
				tmpTxt = tmpTxt.replace(/\[/g, '#&91;')
											.replace(/\]/g, '#&93;')
											.replace(/\>/g, '&lt;')
											.replace(/\</g, '#&gt;');
				md.push(tmpTxt);
				continue;
			}
			
			if (token === HTMLTokeEnum.EndTag) {
				var tagName = value;
				var closeTag = closeTagMap[tagName];
				if (closeTag) {
					md.push(closeTag.e);
				}
				if (tagName === 'ul' && listFlag[listFlag.length - 1] == 'ul') {
					listFlag.pop();
					listIndex = 1;
					continue;
				}
				if (tagName === 'ol' && listFlag[listFlag.length - 1] == 'ol') {
					listFlag.pop();
					listIndex = 1;
					continue;
				}
				if (tagName === 'font') {
					md.push('[/font]');
					continue;
				}
				if (tagName === 'blockquote') {
					blockquoteFlag = false;
				}
				continue;
			}
			
			if (token === HTMLTokeEnum.StartTag) {
				var tagName = value;
				var noCloseTag = noCloseTagMap[tagName];
				var closeTag = closeTagMap[tagName];
				
				if (noCloseTag) {
					if (blockquoteFlag) {
						md.push(noCloseTag + '> ');
					} else {
						md.push(noCloseTag);
					}
				}
				
				if (closeTag) {
					md.push(closeTag.s);
				} 
				
				if (tagName === 'a') {
					var d = innerText(tdl, i, 'a');
					var txt = d.txt;
					var href = getAttr(tdl, i, 'href');
					if (!href) continue;
					md.push(print('[#{value}](#{href})', {
						value: txt || href,
						href: href
					}));
					// 连接地址只能有纯文字内容
					// 所以找到自后的索引给现在的i
					// 让他把中间的内容跳过去
					i = d.i;
					continue;
				} 

			 	if (tagName === 'img') {
					var alt = getAttr(tdl, i,'alt');
					var src = getAttr(tdl, i,'src');
					if (!src) continue;
					alt = alt || src;
					md.push(print('![#{alt}](#{src})', {
						alt: alt || src,
						src: src
					}));
					continue;
				} 
				if (tagName === 'ol') {
					listFlag.push('ol');
					continue;
				}
				if (tagName === 'ul') {
					listFlag.push('ul');
					continue;
				}
				if (tagName === 'li') {
					var txt = subText(tdl, i);
					if (listFlag[listFlag.length - 1] == 'ol') {
						if (blockquoteFlag) {
							md.push('\n> '+ listIndex + '. ' + txt);
						} else {
							md.push('\n' + listIndex + '. ' + txt);
						}
						listIndex++;
						continue;
					} 
					if (listFlag[listFlag.length - 1] == 'ul'){
						if (blockquoteFlag) {
							md.push('\n> - ' + txt );
						} else {
							md.push('\n- ' + txt);
						}
						continue;
					}
					continue;
				}
				if (tagName === 'font') {
					md.push(print('[font color="#{color}"]#{txt}', {
						color: getAttr(tdl, i, 'color') || '',
						txt: subText(tdl, i) || ''
					}));
					continue;
				}
				if (tagName === 'blockquote') {
					blockquoteFlag = true;
				}
			}
		}
		return md.join('');
	};
})(HTMLTokenizer);
