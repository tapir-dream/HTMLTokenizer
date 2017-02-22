function HTMLTokenizer(reader) {

  var HTMLTokenEnum = {
    StartTag: 0,
    EndTag: 1,
    Comment: 2,
    Character: 3,
    Doctype: 4,
  };
  
  var TokenStateEnum = {
    DataState: 0,
    TagOpenState: 1,
    EndTagOpenState: 2,
    TagNameState: 3,
    CommentStartState: 4,
    CommentStartDashState: 5,
    CommentState: 6,
    CommentEndDashState: 7,
    CommentEndState: 8,
    BeforeAttributeNameState: 9,
    AttributeNameState: 10,
    AfterAttributeNameState: 11,
    BeforeAttributeValueState: 12,
    AttributeValueDoubleQuotedState: 13,
    AttributeValueSingleQuotedState: 14,
    AttributeValueUnquotedState: 15,
    AfterAttributeValueQuotedState: 16,
    RCDATAState: 17,
    RAWTEXTState: 18,
    ScriptDataState: 19,
    RCDATALessThanSignState: 20,
    RCDATAEndTagOpenState: 21,
    RCDATAEndTagNameState: 22,
    RAWTEXTLessThanSignState: 23,
    RAWTEXTEndTagOpenState: 24,
    RAWTEXTEndTagNameState: 25,
    ScriptDataLessThanSignState: 26,
    ScriptDataEndTagOpenState: 27,
    ScriptDataEndTagNameState: 28,
    DOCTYPEState: 29,
    BeforeDOCTYPENameState: 30,
    DOCTYPENameState: 31,
    AfterDOCTYPENameState: 32,
    AfterDOCTYPEPublicKeywordState: 33,
    BeforeDOCTYPEPublicIdentifierState: 34,
    DOCTYPEPublicIdentifierDoubleQuotedState: 35,
    DOCTYPEPublicIdentifierSingleQuotedState: 36,
    AfterDOCTYPEPublicIdentifierState: 37,
    BetweenDOCTYPEPublicAndSystemIdentifiersState: 38,
    AfterDOCTYPESystemKeywordState: 39,
    BeforeDOCTYPESystemIdentifierState: 40,
    DOCTYPESystemIdentifierDoubleQuotedState: 41,
    DOCTYPESystemIdentifierSingleQuotedState: 42,
    AfterDOCTYPESystemIdentifierState: 43,
    BogusDOCTYPEState: 44
  };
  
  var TagToState = {
    title: TokenStateEnum.RCDATAState,
    textarea: TokenStateEnum.RCDATAState,
    pre: TokenStateEnum.RCDATAState,
    style: TokenStateEnum.RAWTEXTState,
    xmp: TokenStateEnum.RAWTEXTState, 
    iframe: TokenStateEnum.RAWTEXTState, 
    noembed: TokenStateEnum.RAWTEXTState, 
    noframes: TokenStateEnum.RAWTEXTState,
    noscript: TokenStateEnum.RAWTEXTState,
    script: TokenStateEnum.ScriptDataState
  };
      
  var IgnoreClosedTags = {
    area: true,
    base: true, 
    basefont: true,
    br: true,
    col: true,
    frame: true,
    hr: true,
    img: true,
    input: true,
    isindex: true,
    link: true,
    meta: true,
    param: true
  };
  
  var SelectClosedTags = {
    body: true,
    colgroup: true,
    dd: true,
    dt: true,
    head: true,
    html: true,
    li: true,
    option: true,
    p: true,
    tbody: true,
    td: true,
    tfoot: true,
    th: true,
    thead: true,
    tr: true
  };
    
  var cTokenState = TokenStateEnum.DataState;
  
    var nextToken = function(reader, tokenDataList) {
    var word = '';
    var tl = 0;
    var al = 0;
    var td;
    var tmpBuffer = '';
    var tmpTagName = '';
    var doctypeData = {name: '', pid: '', sid: ''};
    while(!reader.isInputEnd()) {
      var c = reader.nextChar();
      
      switch(cTokenState) {
        case TokenStateEnum.DataState:
          if ('<' === c) {
            var tbuf = reader.offsetChar(1)
            if (!reader.isWordChar(tbuf)) {
              word += c;
              continue;
            }
            cTokenState = TokenStateEnum.TagOpenState;
            if (word !== '') {
              tokenDataList.push({
                token: HTMLTokenEnum.Character,
                value: word,
                cchar: reader.getCharNumber() - 1,
                cline: reader.getLineNumber()
              });
            }
            return true;
          } else {
            word += c;
          }
        break;
      
        case TokenStateEnum.TagOpenState:
          if (reader.isWordChar()) {
            // 表明注释或doctype开始
            if ('!' === c) {
              tmpBuffer = '';
              // 预读7个字符来判断是否为doctype
              for (var i = 0; i < 7; ++i) {
                tmpBuffer += reader.nextChar();
              }
              if ('doctype' === tmpBuffer.toLowerCase()) { //doctype
                cTokenState = TokenStateEnum.DOCTYPEState;
              } else { //注释
                // 将字符回退7个矫正位置
                for (var i = 0; i < 7; ++i) {
                  reader.prevChar();
                }
                
                // 预读两个字符来确定是注释
                if (reader.offsetChar(1) === '-' && reader.offsetChar(2) === '-') {
                  cTokenState = TokenStateEnum.CommentStartState;
                } else {
                  cTokenState = TokenStateEnum.TagNameState;
                  // 吃一个字符矫正位置
                  reader.prevChar();
                }
              }
            } else {
              cTokenState = TokenStateEnum.TagNameState;
              // 吃一个字符矫正位置
              reader.prevChar();
            }
          }
        break;
          
        case TokenStateEnum.TagNameState:
          //TODO:是否需要补充 HTML Tag name 名字规则
          if (reader.isSpaceChar() || reader.isTabChar() || reader.isNewLine()) {
            cTokenState = TokenStateEnum.BeforeAttributeNameState;
            // 将tag name内容填入结构体
            tokenDataList.push({
              token: HTMLTokenEnum.StartTag,
              value: word.toLowerCase(),
              cchar: reader.getCharNumber() - 1,
              cline: reader.getLineNumber(),
              attributes: []
            });
            return true;
            
          } else if ('>' === c) {
            // 说明tag无属性直接结束了
            // 将tag name内容填入结构体
            tokenDataList.push({
              token: HTMLTokenEnum.StartTag,
              value: word.toLowerCase(),
              cchar: reader.getCharNumber() - 1,
              cline: reader.getLineNumber(),
              attributes: []
            });
            // 此处判断是否今日DataState之外的其他状态
            // 处理 style/textarea/pre等 Tag 状态问题
            td = tokenDataList[tokenDataList.length - 1];
            if (td.value in TagToState) {
              cTokenState = TagToState[td.value];
            } else {
              cTokenState = TokenStateEnum.DataState;
            }
            return true;
            
          } else if ('/' === c) {
            cTokenState = TokenStateEnum.EndTagOpenState;
          } else {
            word += c;
          }
        break;
          
        case TokenStateEnum.BeforeAttributeNameState:
          //TODO:是否需要补充 HTML Tag Attribute name 名字规则
          if ('>' === c) {
            // 此处判断是否今日DataState之外的其他状态
            // 处理 style/textarea/pre等 Tag 状态问题
            td = tokenDataList[tokenDataList.length - 1];
            if (td.value in TagToState) {
              cTokenState = TagToState[td.value];
            } else {
              cTokenState = TokenStateEnum.DataState;
            }
            return true;
          } else if ('/' === c) {
            cTokenState = TokenStateEnum.EndTagOpenState;
          } else if (reader.isWordChar() && '/' != c) {
            word += c;
            cTokenState = TokenStateEnum.AttributeNameState;
          } else {
            continue;
          }
          break;
          
        case TokenStateEnum.AttributeNameState:
          //TODO:是否需要补充 HTML Tag Attribute name 名字规则
          if ('=' === c || reader.isSpaceChar() || reader.isTabChar() || reader.isNewLine()) {
            cTokenState = TokenStateEnum.BeforeAttributeValueState;
            // 将attribut name内容填入结构体
            tl = tokenDataList.length - 1;
            tokenDataList[tl].attributes.push({
              name: word.toLowerCase(),
              cchar: reader.getCharNumber() - 1,
              cline: reader.getLineNumber(),
              value: ''
            });
            word = '';
          } else if ('>' === c) {
            // 仅有属性名无属性值情况
            cTokenState = TokenStateEnum.DataState;
            tl = tokenDataList.length - 1;
            tokenDataList[tl].attributes.push({
              name: word.toLowerCase(),
              cchar: reader.getCharNumber() - 1,
              cline: reader.getLineNumber(),
              value: ''
            });
            return true;
          } else {
            word += c;
          }
        break;
          
        case TokenStateEnum.BeforeAttributeValueState:
          oc = reader.offsetChar(-1);
          // 如果前一个字符是 = 则说明从这个字符起，这个char为 attribute value 值
          if (oc == '=') {
            // 判断当前字符 是否为 引号
            if (reader.isSingleQuotes()) {
              cTokenState = TokenStateEnum.AttributeValueSingleQuotedState;
            } else if (reader.isDoubleQuotes()) {
               cTokenState = TokenStateEnum.AttributeValueDoubleQuotedState;
            } else {
              // 不是 引号则 进入没加引号状态
              cTokenState = TokenStateEnum.AttributeValueUnquotedState;
              // 回退一个字符矫正位置
              reader.prevChar();
            }
            
          } else if ('=' === c) {
            // 自身为 = 则状态未变
            cTokenState = TokenStateEnum.BeforeAttributeValueState;
          } else if ('>' === c) {
            // 如果直接遇到 > 字符，则说明标记闭合
            // 此处判断是否今日DataState之外的其他状态
            // 处理 style/textarea/pre等 Tag 状态问题
            td = tokenDataList[tokenDataList.length - 1];
            if (td.value in TagToState) {
              cTokenState = TagToState[td.value];
            } else {
              cTokenState = TokenStateEnum.DataState;
            }
          } else if (reader.isWordChar()) {
            // 最后如果自身不是 = 字符 说明不是 attribute value 而是一个新的属性名
            // 回退一个字符矫正位置
            reader.prevChar();
            cTokenState = TokenStateEnum.AttributeNameState;
          }
        break;
          
        case TokenStateEnum.AttributeValueUnquotedState:
          // 直到有字符位置
          if (reader.isWordChar()&& (c != '>' && c != '/')) {
            word += c;
          } else if (word.length > 0 &&
            (reader.isSpaceChar() || reader.isTabChar()) || reader.isNewLine()
            || c == '>' || c == '/') {
            // 否则是value后有空格情况或者直接闭合情况
            cTokenState = TokenStateEnum.AfterAttributeValueQuotedState;
            // 将attribut value内容填入结构体
            tl = tokenDataList.length - 1;
            al = tokenDataList[tl].attributes.length - 1;
            tokenDataList[tl].attributes[al].quotes = '';
            tokenDataList[tl].attributes[al].value = word;
            tokenDataList[tl].attributes[al].cchar = reader.getCharNumber() - 1;
            tokenDataList[tl].attributes[al].cline = reader.getLineNumber();
            word = '';
            // 回退一个字符矫正位置
            reader.prevChar();
          }
        break;
        
        case TokenStateEnum.AttributeValueDoubleQuotedState: 
         if (reader.isDoubleQuotes()) {
            cTokenState = TokenStateEnum.AfterAttributeValueQuotedState;
            // 将attribut value内容填入结构体
            tl = tokenDataList.length - 1;
            al = tokenDataList[tl].attributes.length - 1;
            tokenDataList[tl].attributes[al].quotes = '\"';
            tokenDataList[tl].attributes[al].value = word;
            tokenDataList[tl].attributes[al].cchar = reader.getCharNumber() - 1;
            tokenDataList[tl].attributes[al].cline = reader.getLineNumber();
            word = '';
          }  else {
            word += c;
          }
        break;
          
        case TokenStateEnum.AttributeValueSingleQuotedState: 
          if (reader.isSingleQuotes()) {
            // 将attribut value内容填入结构体
            cTokenState = TokenStateEnum.AfterAttributeValueQuotedState;
            tl = tokenDataList.length - 1;
            al = tokenDataList[tl].attributes.length - 1;
            tokenDataList[tl].attributes[al].quotes = '\'';
            tokenDataList[tl].attributes[al].value = word;
            tokenDataList[tl].attributes[al].cchar = reader.getCharNumber() - 1;
            tokenDataList[tl].attributes[al].cline = reader.getLineNumber();
            word = '';
          } else {
            word += c;
          }
        break;
        
        case TokenStateEnum.AfterAttributeValueQuotedState:
          if ('/' === c) {
						cTokenState = TokenStateEnum.EndTagOpenState;
          } else if ('>' === c) {
            // 此处判断是否今日DataState之外的其他状态
            // 处理 style/textarea/pre等 Tag 状态问题
            td = tokenDataList[tokenDataList.length - 1];
            if (td.value in TagToState) {
              cTokenState = TagToState[td.value];
            } else {
              cTokenState = TokenStateEnum.DataState;
            }
            return true;
          } else {
            cTokenState = TokenStateEnum.BeforeAttributeNameState;
          }
        break;
        
        case TokenStateEnum.EndTagOpenState:
          if ('>' === c) {
            cTokenState = TokenStateEnum.DataState;
            // 将tag name内容填入结构体
            tokenDataList.push({
              token: HTMLTokenEnum.EndTag,
              value: word.toLowerCase(),
              value: word.toLowerCase() || tokenDataList[tokenDataList.length -1].value,
							selfClose: !word,
              cchar: reader.getCharNumber() - 1,
              cline: reader.getLineNumber()
            });
            return true;
          } else {
            word += c;
          }
        break;
        
        case TokenStateEnum.RCDATAState:
          if ('<' === c) {
            // 标签可能闭合了，将可能字符串存入临时缓冲
            tmpBuffer += c;
            cTokenState = TokenStateEnum.RCDATALessThanSignState;
          } else {
            // 当做普通字符累加
            word += c;
          }
        break;
        
        case TokenStateEnum.RCDATALessThanSignState:
          if ('/' === c) {
            tmpBuffer += c;
            cTokenState = TokenStateEnum.RCDATAEndTagOpenState;
          } else {
            cTokenState = TokenStateEnum.RCDATAState;
            // 它是普通文本，把它放入 word 内并补足上一状态的 < 字符
            // 并且清空 tmpBuffer
            word += '<' + c;
            tmpBuffer = '';
          }
        break;
            
        case TokenStateEnum.RCDATAEndTagOpenState:
          tmpBuffer += c;
          tmpTagName += c;
          if (!reader.isWordChar() || '>' === reader.offsetChar(1)) {
            cTokenState = TokenStateEnum.RCDATAEndTagNameState;
          }
        break;
        
        case TokenStateEnum.RCDATAEndTagNameState:
          td = tokenDataList[tokenDataList.length - 1];
          // 开始标签如果与预取解释标签名一致
          // 就认为这个标签闭合了
          if (td.value === tmpTagName) {
            // 此处需要存入两个 Token
            // 一个是 RCDATA 值 Token
            // 另一个是闭合 tag 的 Token
            if (word != '') {
              tokenDataList.push({
                token: HTMLTokenEnum.Character,
                value: word,
                needEscape: true,
                cchar: reader.getCharNumber() - tmpTagName.length - 3,
                cline: reader.getLineNumber()
              });
            }
            tokenDataList.push({
              token: HTMLTokenEnum.EndTag,
              value: tmpTagName.toLowerCase(),
              cchar: reader.getCharNumber() - 1,
              cline: reader.getLineNumber()
            });
            cTokenState = TokenStateEnum.DataState;
            return true;
            
          } else {
            tmpBuffer += c;
            // 如果没校验成功配对闭合，则累加 word 值和缓存值
            // 并清空缓存内容
            word += tmpBuffer;
            tmpBuffer = '';
            tmpTagName = '';
            cTokenState = TokenStateEnum.RCDATAState;
          }
        break;
        
        case TokenStateEnum.RAWTEXTState:
          if ('<' === c) {
            // 标签可能闭合了，将可能字符串存入临时缓冲
            tmpBuffer += c;
            cTokenState = TokenStateEnum.RAWTEXTLessThanSignState;
          } else {
            // 当做普通字符累加
            word += c;
          }
        break;
        
        case TokenStateEnum.RAWTEXTLessThanSignState:
          if ('/' === c) {
            tmpBuffer += c;
            cTokenState = TokenStateEnum.RAWTEXTEndTagOpenState;
          } else {
            cTokenState = TokenStateEnum.RAWTEXTState;
            // 它是普通文本，把它放入 word 内并补足上一状态的 < 字符
            // 并且清空 tmpBuffer
            word += '<' + c;
            tmpBuffer = '';
          }
        break;
        
        case TokenStateEnum.RAWTEXTEndTagOpenState:
          tmpBuffer += c;
          tmpTagName += c;
          if (!reader.isWordChar() || '>' === reader.offsetChar(1)) {
            cTokenState = TokenStateEnum.RAWTEXTEndTagNameState;
          }
        break;
        
        case TokenStateEnum.RAWTEXTEndTagNameState:
          td = tokenDataList[tokenDataList.length - 1];
          // 开始标签如果与预取解释标签名一致
          // 就认为这个标签闭合了
          if (td.value === tmpTagName) {
            // 此处需要存入两个 Token
            // 一个是 RCDATA 值 Token
            // 另一个是闭合 tag 的 Token
            if (word != '') {
              tokenDataList.push({
                token: HTMLTokenEnum.Character,
                value: word,
                needEscape: false,
                cchar: reader.getCharNumber() - tmpTagName.length - 3,
                cline: reader.getLineNumber()
              });
            }
            tokenDataList.push({
              token: HTMLTokenEnum.EndTag,
              value: tmpTagName.toLowerCase(),
              cchar: reader.getCharNumber() - 1,
              cline: reader.getLineNumber()
            });
            cTokenState = TokenStateEnum.DataState;
            return true;
            
          } else {
            tmpBuffer += c;
            // 如果没校验成功配对闭合，则累加 word 值和缓存值
            // 并清空缓存内容
            word += tmpBuffer;
            tmpBuffer = '';
            tmpTagName = '';
            cTokenState = TokenStateEnum.RAWTEXTState;
          }
        break;
          
        case TokenStateEnum.ScriptDataState:
          if ('<' === c) {
            // 标签可能闭合了，将可能字符串存入临时缓冲
            tmpBuffer += c;
            cTokenState = TokenStateEnum.ScriptDataLessThanSignState;
          } else {
            // 当做普通字符累加
            word += c;
          }
        break;
        
        case TokenStateEnum.ScriptDataLessThanSignState:
          if ('/' === c) {
            tmpBuffer += c;
            cTokenState = TokenStateEnum.ScriptDataEndTagOpenState;
          } else {
            cTokenState = TokenStateEnum.ScriptDataState;
            // 它是普通文本，把它放入 word 内并补足上一状态的 < 字符
            // 并且清空 tmpBuffer
            word += '<' + c;
            tmpBuffer = '';
          }
        break;
        
        case TokenStateEnum.ScriptDataEndTagOpenState:
          tmpBuffer += c;
          tmpTagName += c;
          if (!reader.isWordChar() || '>' === reader.offsetChar(1)) {
            cTokenState = TokenStateEnum.ScriptDataEndTagNameState;
          }
        break;
        
        case TokenStateEnum.ScriptDataEndTagNameState:
          td = tokenDataList[tokenDataList.length - 1];
          // 开始标签如果与预取解释标签名一致
          // 就认为这个标签闭合了
          if (td.value === tmpTagName) {
            // 此处需要存入两个 Token
            // 一个是 RCDATA 值 Token
            // 另一个是闭合 tag 的 Token
            if (word != '') {
              tokenDataList.push({
                token: HTMLTokenEnum.Character,
                value: word,
                needEscape: false,
                cchar: reader.getCharNumber() - tmpTagName.length - 3,
                cline: reader.getLineNumber()
              });
            }
            tokenDataList.push({
              token: HTMLTokenEnum.EndTag,
              value: tmpTagName.toLowerCase(),
              cchar: reader.getCharNumber() - 1,
              cline: reader.getLineNumber()
            });
            cTokenState = TokenStateEnum.DataState;
            return true;
            
          } else {
            tmpBuffer += c;
            // 如果没校验成功配对闭合，则累加 word 值和缓存值
            // 并清空缓存内容
            word += tmpBuffer;
            tmpBuffer = '';
            tmpTagName = '';
            cTokenState = TokenStateEnum.ScriptDataState;
          }
        break;
        
        // ========注释标签解析===========
        case TokenStateEnum.CommentStartState:
          if ('-' === c) {
            cTokenState = TokenStateEnum.CommentStartDashState;
          } 
        break;
          
        case TokenStateEnum.CommentStartDashState:
          if ('-' === c) {
            cTokenState = TokenStateEnum.CommentState;
          }
        break;
          
        case TokenStateEnum.CommentState:
          if ('-' === c && '-' == reader.offsetChar(1)) {
            cTokenState = TokenStateEnum.CommentEndDashState;
          } else {
            // 注释文字处理
            // 一个个字符保存起来
            word += c;
          }
        break;
          
        case TokenStateEnum.CommentEndDashState:
          if ('-' === c && '>' == reader.offsetChar(1)) {
            cTokenState = TokenStateEnum.CommentEndState;
          }
        break;
          
        case TokenStateEnum.CommentEndState:
          cTokenState = TokenStateEnum.DataState;
          // 将注释内容填入结构体
          tokenDataList.push({
            token: HTMLTokenEnum.Comment,
            value: word,
            cchar: reader.getCharNumber() - word.length - 3,
            cline: reader.getLineNumber()
          });
          return true;
        break;
        // ========注释标签解析完毕==========
        
        // ========DocType解析==========
        case TokenStateEnum.DOCTYPEState:
          if (!reader.isWordChar()) {
            cTokenState = TokenStateEnum.BeforeDOCTYPENameState;
            continue;
          }
          if ('>' === c) {
            cTokenState = TokenStateEnum.DataState;
            // 将Doctype内容填入结构体
            tokenDataList.push({
              token: HTMLTokenEnum.Doctype,
              name: doctypeData.name,
              pid: doctypeData.pid,
              sid: doctypeData.sid,
              cchar: reader.getCharNumber(),
              cline: reader.getLineNumber()
            });
            continue;
          }
          // parser error in DOCTYPEState.
          cTokenState = TokenStateEnum.BogusDOCTYPEState;
        break;
        
        case TokenStateEnum.BeforeDOCTYPENameState:
          if (reader.isSpaceChar()) { 
            continue;
          }
          if (reader.isWordChar()) {
            cTokenState = TokenStateEnum.DOCTYPENameState;
            // 回退一个字符
            reader.prevChar();
            continue;
          }
          if ('>' === c) {
            cTokenState = TokenStateEnum.DataState;
            // 将Doctype内容填入结构体
            tokenDataList.push({
              token: HTMLTokenEnum.Doctype,
              name: doctypeData.name,
              pid: doctypeData.pid,
              sid: doctypeData.sid,
              cchar: reader.getCharNumber(),
              cline: reader.getLineNumber()
            });
            continue;
          }
        break;
        
        case TokenStateEnum.DOCTYPENameState:
          if ('>' === c) {
            cTokenState = TokenStateEnum.DataState;
            // 将Doctype内容填入结构体
            tokenDataList.push({
              token: HTMLTokenEnum.Doctype,
              name: doctypeData.name,
              pid: doctypeData.pid,
              sid: doctypeData.sid,
              cchar: reader.getCharNumber(),
              cline: reader.getLineNumber()
            });
            continue;
          }
          if (reader.isWordChar()) { 
            doctypeData.name += c;
            continue;
          } else {
            cTokenState = TokenStateEnum.AfterDOCTYPENameState;
          }
        break;
        
        case TokenStateEnum.AfterDOCTYPENameState:
          if (!reader.isWordChar()) {
            continue;
          }
          if ('>' === c) {
            cTokenState = TokenStateEnum.DataState;
            // 将Doctype内容填入结构体
            tokenDataList.push({
              token: HTMLTokenEnum.Doctype,
              name: doctypeData.name,
              pid: doctypeData.pid,
              sid: doctypeData.sid,
              cchar: reader.getCharNumber(),
              cline: reader.getLineNumber()
            });
            continue;
          }
          
          tmpBuffer = '';
          tmpBuffer += c;
          // 向后预读5个字符来判断是否为 public
          for (var i = 0; i < 5; ++i) {
            tmpBuffer += reader.nextChar();
          }
          if ('public' === tmpBuffer.toLowerCase()) {
            cTokenState = TokenStateEnum.AfterDOCTYPEPublicKeywordState;
            continue;
          }
          if ('system' === tmpBuffer.toLowerCase()) {
            cTokenState = TokenStateEnum.AfterDOCTYPESystemKeywordState;
            continue;
          }
          // 不是 pid 也不是 sid 就去 BogusDOCTYPEState 吧……
          cTokenState = TokenStateEnum.BogusDOCTYPEState;
          // 回退 5 个字符
          for (var i = 0; i < 5; ++i) {
            reader.prevChar();
          }
        break;
        
        // pid 解析
        case TokenStateEnum.AfterDOCTYPEPublicKeywordState:
          if (!reader.isWordChar()) {
            cTokenState = TokenStateEnum.BeforeDOCTYPEPublicIdentifierState;
            continue;
          }
          if ('>' === c) {
            // Parse error in AfterDOCTYPEPublicKeywordState.
            cTokenState = TokenStateEnum.BogusDOCTYPEState;
          }
        break;
        
        case TokenStateEnum.BeforeDOCTYPEPublicIdentifierState:
          if (reader.isSingleQuotes()) {
            cTokenState = TokenStateEnum.DOCTYPEPublicIdentifierSingleQuotedState;
            continue;
          }
          if (reader.isDoubleQuotes()) {
            cTokenState = TokenStateEnum.DOCTYPEPublicIdentifierDoubleQuotedState;
            continue;
          }
          if ('>' === c) {
            // Parse error in AfterDOCTYPEPublicKeywordState.
            cTokenState = TokenStateEnum.BogusDOCTYPEState;
          }
        break;
        
        case TokenStateEnum.DOCTYPEPublicIdentifierDoubleQuotedState:
          if ('>' === c) {
            // Parse error in DOCTYPEPublicIdentifierDoubleQuotedState.
            cTokenState = TokenStateEnum.BogusDOCTYPEState;
          }
          if (reader.isDoubleQuotes()) {
            cTokenState = TokenStateEnum.AfterDOCTYPEPublicIdentifierState;
            continue;
          }
          if (reader.isWordChar()) {
            doctypeData.pid += c; 
          }
        break;
        
        case TokenStateEnum.DOCTYPEPublicIdentifierSingleQuotedState:
          if ('>' === c) {
            // Parse error in DOCTYPEPublicIdentifierSingleQuotedState.
            cTokenState = TokenStateEnum.BogusDOCTYPEState;
          }
          if (reader.isSingleQuotes()) {
            cTokenState = TokenStateEnum.AfterDOCTYPEPublicIdentifierState;
            continue;
          }
          if (reader.isWordChar()) {
            doctypeData.pid += c; 
          }
        break;
        
        case TokenStateEnum.AfterDOCTYPEPublicIdentifierState:
          if (!reader.isWordChar()) {
            cTokenState = TokenStateEnum.BetweenDOCTYPEPublicAndSystemIdentifiersState;
            continue;
          }
          // Parse error in AfterDOCTYPEPublicIdentifierState.
          cTokenState = TokenStateEnum.BogusDOCTYPEState;
        break;
        
        case TokenStateEnum.BetweenDOCTYPEPublicAndSystemIdentifiersState:
          if ('>' === c) {
            cTokenState = TokenStateEnum.DataState;
            // 将Doctype内容填入结构体
            tokenDataList.push({
              token: HTMLTokenEnum.Doctype,
              name: doctypeData.name,
              pid: doctypeData.pid,
              sid: doctypeData.sid,
              cchar: reader.getCharNumber(),
              cline: reader.getLineNumber()
            });
            continue;
          }
          if (reader.isSingleQuotes()) {
            cTokenState = TokenStateEnum.DOCTYPESystemIdentifierSingleQuotedState;
            continue;
          }
          if (reader.isDoubleQuotes()) {
            cTokenState = TokenStateEnum.DOCTYPESystemIdentifierDoubleQuotedState;
            continue;
          }
        break;
        
        // sid 解析
        case TokenStateEnum.AfterDOCTYPESystemKeywordState:
          if (!reader.isWordChar()) {
            cTokenState = TokenStateEnum.BeforeDOCTYPESystemKeywordState;
            continue;
          }
          if ('>' === c) {
            // Parse error in AfterDOCTYPESystemKeywordState.
            cTokenState = TokenStateEnum.BogusDOCTYPEState;
          }
        break;
        
        case TokenStateEnum.BeforeDOCTYPESystemIdentifierState:
          if (reader.isSingleQuotes()) {
            cTokenState = TokenStateEnum.DOCTYPESystemIdentifierSingleQuotedState;
            continue;
          }
          if (reader.isDoubleQuotes()) {
            cTokenState = TokenStateEnum.DOCTYPESystemIdentifierDoubleQuotedState;
            continue;
          }
          // Parse error in BeforeDOCTYPESystemIdentifierState.
          cTokenState = TokenStateEnum.BogusDOCTYPEState;
        break;
        
        case TokenStateEnum.DOCTYPESystemIdentifierDoubleQuotedState:
          if ('>' === c) {
            // Parse error in DOCTYPESystemIdentifierDoubleQuotedState.
            cTokenState = TokenStateEnum.BogusDOCTYPEState;
          }
          if (reader.isDoubleQuotes()) {
            cTokenState = TokenStateEnum.AfterDOCTYPESystemIdentifierState;
            continue;
          }
          if (reader.isWordChar()) {
            doctypeData.sid += c; 
          }
        break;
        
        case TokenStateEnum.DOCTYPESystemIdentifierSingleQuotedState:
          if ('>' === c) {
            // Parse error in DOCTYPESystemIdentifierSingleQuotedState.
            cTokenState = TokenStateEnum.BogusDOCTYPEState;
          }
          if (reader.isSingleQuotes()) {
            cTokenState = TokenStateEnum.AfterDOCTYPESystemIdentifierState;
            continue;
          }
          if (reader.isWordChar()) {
            doctypeData.sid += c;
          }
        break;
        
        case TokenStateEnum.AfterDOCTYPESystemIdentifierState:
          if ('>' === c) {
            cTokenState = TokenStateEnum.DataState;
            // 将Doctype内容填入结构体
            tokenDataList.push({
              token: HTMLTokenEnum.Doctype,
              name: doctypeData.name,
              pid: doctypeData.pid,
              sid: doctypeData.sid,
              cchar: reader.getCharNumber(),
              cline: reader.getLineNumber()
            });
            continue;
          }
          // Parse error in AfterDOCTYPESystemIdentifierState.'
          cTokenState = TokenStateEnum.BogusDOCTYPEState;
        break;
        
        case TokenStateEnum.BogusDOCTYPEState:
          if ('>' === c) {
            cTokenState = TokenStateEnum.DataState;
            // 将Doctype内容填入结构体
            tokenDataList.push({
              token: HTMLTokenEnum.Doctype,
              name: doctypeData.name,
              pid: doctypeData.pid,
              sid: doctypeData.sid,
              cchar: reader.getCharNumber(),
              cline: reader.getLineNumber()
            });
            continue;
          }
        break;
        // ========DocType解析完毕==========
      }
    }
    
    // 纯字符扫尾
    if (tokenDataList.length == 0 && word != '') {
      tokenDataList.push({
        token: HTMLTokenEnum.Character,
        value: word,
        needEscape: false,
        cchar: 1,
        cline: 1
      });
      return false;
    }
    // 结尾文本标记扫尾
    if (word !== '') {
      tokenDataList.push({
        token: HTMLTokenEnum.Character,
        value: word,
        cchar: reader.getCharNumber() - 1,
        cline: reader.getLineNumber()
      });
      return false;
    }
    return false;
  };
    
  var scanner = function() {
    // tokenDataList 每项结构
    // {name: HTMLTokenEnum.StartTag, value: 'a', attriubtes: [{attrName: attrValue}, {attrName: attrValue}]};
    cTokenState = TokenStateEnum.DataState;
    var tokenDataList =[];
    while(nextToken(reader, tokenDataList)) {}
    return tokenDataList;
  };
  
  var toHTML = function(tdl) {
    if (!tdl) {
      return false;
    }
    var html = '';
    var c = tdl.length;
    if (c == 0) {
      return '';
    }
    for (var i = 0; i < c; ++i) {
      var data = tdl[i];
      var token = data.token;
      var quotes;
      switch (token) {
        case HTMLTokenEnum.StartTag:
          html += '<' + data.value;
          for (var j = 0, len = data.attributes.length; j < len; ++j) {
            var attr =  data.attributes[j];
            if (!attr.value) {
              html += ' ' + attr.name;
            } else {
              quotes = attr.quotes || '"';
              html += ' ' + attr.name + '=' +  quotes + attr.value + quotes;
            }
          }
          if (IgnoreClosedTags[data.value]) {
            html += ' />';
          } else {
            html += '>';
          }
        break;
        
        case HTMLTokenEnum.EndTag:
          html += '</' + data.value + '>';
        break;
        
        case HTMLTokenEnum.Comment:
          // 暂时不要输出注释了
          //html += '<!\-\-' + data.value + '\-\->';
        break;
        
        case HTMLTokenEnum.Doctype:
          html += '<!DOCTYPE' + data.name;
          if (data.pid && data.pid != '') {
            html += ' PUBLIC \"'  + data.pid + '\"';
          }
          if (data.sid && data.sid != '') {
            html += ' \"'  + data.sid + '\"';
          }
          html += '>';
        break;
        
        case HTMLTokenEnum.Character:
          if (data.needEscape) {
            html += htmlEncode(data.value);
          } else {
            html += data.value;
          }
        break;
      }
    }
    return html;
  };
  
  
  var tagClosedCheck = function(tdl, isXHTMLMode) {
    if (!tdl) {
      return false;
    }
    var c = tdl.length;
    if (c == 0) {
      return false;
    }

    var tagStack = [];
    var noClosedTags = [];
    
    for (var i = 0; i < c; ++i) {
      var data = tdl[i];
      var token = data.token;
      var tagName = data.value;
      if (token === HTMLTokenEnum.StartTag) {
        if (!IgnoreClosedTags[tagName]) {
          // 所有标签全部入栈
          tagStack.unshift(tagName);
        }
        continue;
      }
      
      if (token === HTMLTokenEnum.EndTag) {
        if (isXHTMLMode) {
          if (tagStack[0] === tagName) {
            tagStack.shift(0);
          } else {
            noClosedTags.push(data);
          }
          continue;
        }
        // 非严格模式下判断不闭合标记栈顶标记是否为可忽略闭合的
        // 非严格模式下相等出栈
        if (tagStack[0] == tagName) {
          tagStack.shift(0);
        } else if (SelectClosedTags[tagStack[0]]) {
          // 不相等
          // 看看栈顶标记是否可以忽略闭合则出栈
          tagStack.shift(0);
        } else {
          noClosedTags.push(data);
        }
      }
    }
    return noClosedTags;
    
  };
  
  var HTMLAttrValFilter = function(tdl, fd) {
    if (!fd) {
      fd = {
        '*' : '',
        href: 'javascript:'
      };
    }
    var c = tdl.length;
    if (c == 0) {
      return false;
    }
    
    var newTdl = [];
    for (var i = 0; i < c; ++i) {
      var data = tdl[i];
      var token = data.token;
      // 与标记无关的东西都扔到新数组,但不包含textarea等标记内的文本节点
      if (token != HTMLTokenEnum.StartTag || !data.attributes) {
        newTdl.push(data);
        continue;
      }

      // 对属性数据进行过滤
      var newAttrs = [];
      var attrs = data.attributes;
      for (var j = 0, len = attrs.length; j < len; ++j) {
        data.attributes = newAttrs;
        var attr = attrs[j];
        var val = attr.value.toLowerCase();
        // 如果再在全局配置内不存在且在具体attr配置内不存在才加入到新 attrs 中去
        if (((!fd['*']) ||  val.indexOf(fd['*']) == -1) && 
              ((!fd[attr.name]) || attr.value == '' || val.indexOf(fd[attr.name]) == -1)) {
          newAttrs.push(attr);
        } 
      }
      newTdl.push(data);
    }      
    return newTdl;
  };
  
  var HTMLFilter = function(tdl, fd) {
    if (!fd) {
      fd = {
        tags: {p: true, a: true, span: true, br: true, textarea: true},
        attrs: {
          '*': {'class': true, 'id': true, 'mid': true, 'isforward': true, 'action-type': true, 'action-data': true},
          img: {'src': true},
          div: {'diss-data': true},
          script: {'type': true}
        }
      };
    }
    
    var c = tdl.length;
    if (c == 0) {
      return false;
    }
    
    var newTdl = [];
    for (var i = 0; i < c; ++i) {
      var data = tdl[i];
      var token = data.token;
      var tagName = data.value;
      var attr;
      
      // 与标记无关的东西都扔到新数组,但不包含textarea等标记内的文本节点
      if (token != HTMLTokenEnum.StartTag && token != HTMLTokenEnum.EndTag &&
          !('needEscape' in data)) {
        newTdl.push(data);
        continue;
      }
      
      // 处理标记
      if (token === HTMLTokenEnum.StartTag || token === HTMLTokenEnum.EndTag) {
        // 如果有 tags，就看看开始结束标签是否在内，把不在内的放入新数组
        // 并且继续执行幸存的标签属性过滤
        if (fd.tags && !fd.tags[tagName]) {
          newTdl.push(data);
          // 如果幸存的标签是 textarea 之类可包含html的标签则特殊处理他们的文本节点
          // 把他们直接放入数组
          if (tagName in TagToState && fd.tags && !fd.tags[tagName] && tdl[i + 1].token ==  HTMLTokenEnum.Character) {
            // 后一项数据必然是文本节点
            newTdl.push(tdl[i + 1]);
          }
        } else if (!fd.tags) {
          // 否则没有 tags 的话说么啥都不过滤，所有内容放入新数组
          newTdl.push(data);
        }  
      }

      // 过滤开始标签的属性
      if (token === HTMLTokenEnum.StartTag) {
        // 有过滤属性表的情况
        if (fd.attrs) {
          // 为了避免数组引用，构建个新属性数组
          var attrs = data.attributes;
          data.fliterAttrs = [];
          // 遍历当前开始标签的每个属性
          for (var j = 0, len = attrs.length; j < len; ++j) {
            attr = attrs[j];
            
            // 如果有通用规则，则需要结合过滤个别规则
            if (fd.attrs['*']) {
              // 如果不存在个别过滤规则，则直接过滤任何标记内容
              if (!fd.attrs[tagName] && !fd.attrs['*'][attr.name]) {
                data.fliterAttrs.push(attr);
                continue;
              }            
              // 判断是否存在个别规则，如果存在则合并过滤内容
              if (fd.attrs[tagName] && !fd.attrs['*'][attr.name] && !fd.attrs[tagName][attr.name]) {
                data.fliterAttrs.push(attr);
                continue;
              }  
            }  else {
              // 如果没有通用规则，仅过滤个别规则
              if (fd.attrs[tagName] && !fd.attrs[tagName][attr.name]) {
                data.fliterAttrs.push(attr);
              } 
            }
          }
          data.attributes = data.fliterAttrs;
          delete data.fliterAttrs;
          continue;
        }
      }
    }
    return newTdl;
  };
  
  var HTMLSelector = function(tdl, sd) {
    if (!sd) {
      sd = {
        '*': {'class': true, 'id': true, 'action-type': true, 'action-data': true},
        p: {'node-type': true},
        div: {'mid': true},
        span: {'node-type': true},
        br: {},
        textarea: {},
        script: {'type': true}  
      };
    }
    var c = tdl.length;
    if (c == 0) {
      return false;
    }
    var newTdl = [];
    for (var i = 0; i < c; ++i) {
      var data = tdl[i];
      var token = data.token;
      var tagName = data.value;
      var attr;
      if (token === HTMLTokenEnum.StartTag && sd[tagName]) {
        var attrs = data.attributes;
        newTdl.push(data);
        // 特殊处理 textarea 等特殊节点被选择使用的情况
        if (tagName in TagToState && tdl[i + 1].token ==  HTMLTokenEnum.Character) {
          // 下一个内容肯定是它的文本节点，把它放入新数组
          newTdl.push(tdl[i + 1]);
        }
        
        // 没有 attribute 的 tdl 结构就不重构它的 attrs 了
        if (!attrs) {
          continue;
        }
        
        // 为了避免数组引用，构建个新属性数组
        data.newAttrs = [];
        // 遍历属性合法性
        for (var j = 0, len = attrs.length; j < len; ++j) {
          attr = attrs[j];
          // 如果有通用规则，则需要结合具体tag的attrs处理
          // 自己定义了就用自己的，自己没定义就用通用的
          if ((sd[tagName] && sd[tagName][attr.name]) ||
                (sd['*'] && sd['*'][attr.name])) {
            data.newAttrs.push(attr);
            continue;
          }
          
          // 没有通用规则就直接选择tag定义的attrs
          if (attr && sd[tagName][attr.name]) {
            data.newAttrs.push(attr);
          }
        }
        // 将老 attrs 覆盖
        data.attributes = data.newAttrs;
        delete data.newAttrs;
        continue;
      }  
        
      if (token === HTMLTokenEnum.EndTag && sd[tagName]) {
        newTdl.push(data);
        continue;
      }
      // 非textarea等可包含其他html代码的文本节点都扔进去
      if (token != HTMLTokenEnum.StartTag && token != HTMLTokenEnum.EndTag &&
          !('needEscape' in data)) {
        newTdl.push(data);
        continue;
      }
      
    }
    return newTdl;
  };
  
  var htmlEncode = function(code) {
    if (typeof code != 'string') {
      throw ('args one is not string!');
    }
    var lc = '&#';
    var rc = ';';
    var encode = '';
    for (var i = 0, c = code.length; i < c; ++i) {
      encode += lc + code.charCodeAt(i) + rc;
    }
    return encode;
  };
  
  return {
    HTMLTokenEnum: HTMLTokenEnum,
    scanner: scanner,
    toHTML: toHTML,
    tagClosedCheck: tagClosedCheck,
    HTMLSelector: HTMLSelector,
    HTMLFilter: HTMLFilter,
    HTMLAttrValFilter: HTMLAttrValFilter
  };
};
  
function Reader(stream) {
  if (typeof stream != 'string') {
    throw('Input stream is not a string!');
  }
  
  var index = -1;
  var len = stream.length;
  
  var lineNumber = 0;
  var charNumber = 0;
  var getChar = function() {
    return stream.charAt(index);
  };
  
  var nextChar = function() {
    charNumber++;
    index++;
    if (isNewLine()) {
      charNumber = 0;
      lineNumber++;
    }
    
    return stream.charAt(index);
  };
  
  var prevChar = function(bool) {
    charNumber--;
    index--;
    return bool && stream.charAt(index);
  };  
  
  var offsetChar = function(num) {
    if (typeof num != 'number') {
      num = 0;
    }
    
    var i = index + num;
    if (i < 0) {
      i = 0;
    }
    if (i >= len) {
      i = len;
    }
    return stream.charAt(i);
  };
  
  var isInputEnd = function() {
    return (index >= len) ? true : false;
  };
  
  var isNewLine = function() {
    var c = getChar();
    if (c.charCodeAt(0) === 10) {
      return true;
    }
    
    if (c.charCodeAt(0) === 13) {
      return true;
    }
    // window system new line
    if (c.charCodeAt(0) === 13 && offsetChar(1).charCodeAt(0) === 10) {
      return true;
    }
    return false;
  };

  var isTabChar = function() {
    return getChar().charCodeAt(0) === 9 ? true : false;
  };

  var isSpaceChar = function() {
    return getChar().charCodeAt(0) === 32 ? true : false;
  };

  var isFullWidthSace = function() {
    return getChar().charCodeAt(0) === 12288 ? true : false;
  };

  var isSingleQuotes = function() {
    return getChar().charCodeAt(0) === 39 ? true : false;
  };

  var isDoubleQuotes = function() {
    return getChar().charCodeAt(0) === 34 ? true : false;
  };
  
  var isWordChar = function() {
    return !(isSpaceChar() || isTabChar() || isNewLine());
  };
  
  var getLineNumber = function() {
    return lineNumber + 1;
  };
  
  var getCharNumber = function() {
    return charNumber + 1;
  };
  
  return {
    nextChar: nextChar,
    prevChar: prevChar,
    offsetChar: offsetChar,
    isNewLine: isNewLine,
    isTabChar: isTabChar,
    isSpaceChar: isSpaceChar,
    isWordChar: isWordChar,
    isFullWidthSace: isFullWidthSace,
    isSingleQuotes: isSingleQuotes,
    isDoubleQuotes: isDoubleQuotes,
    isInputEnd: isInputEnd,
    getLineNumber: getLineNumber,
    getCharNumber: getCharNumber
  };
}
