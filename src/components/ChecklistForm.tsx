import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Copy, RotateCcw, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { ContactTable } from './ContactTable';
import { EditableSelect } from './EditableSelect';
import { toast } from 'sonner@2.0.3';

interface FormData {
  [key: string]: string;
}

interface ChecklistQuestion {
  id: string;
  question: string;
  options: string[];
  section: string;
  required?: boolean;
}

interface Template {
  id: string;
  name: string;
  conditions: { [key: string]: string };
  code: string;
  comment: string;
}

const CHECKLIST_QUESTIONS: ChecklistQuestion[] = [
  // Fase
  { id: 'fase', question: 'Fase', options: ['Hotline', '1ª Tentativa', '2ª Tentativa', '3ª Tentativa', 'Última Tentativa', 'Prioridade', 'Mediação', 'Notificação Extrajudicial', 'Tratativas Especiais', 'Gerenciamento de Parceiros'], section: 'Fase', required: true },
  
  // Checklist N1
  { id: 'card_aprovado', question: 'Card foi aprovado pelo cliente?', options: ['Sim', 'Não'], section: 'N1', required: true },
  { id: 'nova_tentativa', question: 'É uma nova tentativa? Se sim, tivemos retorno no e-mail?', options: ['Sim, com retorno', 'Não', 'Sim, sem retorno'], section: 'N1', required: true },
  { id: 'outro_card', question: 'Existe outro card desse concorrente em fluxo?', options: ['Sim', 'Não'], section: 'N1', required: true },
  { id: 'possui_etiqueta', question: 'Possui etiqueta de Prioridade, Concorrente não quer contato, Tratativa Atendimento ou NE Branddi?', options: ['Sim', 'Não'], section: 'N1', required: true },
  { id: 'qual_etiqueta', question: 'Se sim, qual?', options: ['Prioridade', 'Concorrente não quer contato', 'Tratativa Atendimento', 'NE Branddi', 'N/A'], section: 'N1' },
  { id: 'temos_hotline', question: 'Temos hotline?', options: ['Sim', 'Não'], section: 'N1', required: true },
  
  // OPEC
  { id: 'site_remete_cliente', question: 'O site do concorrente ou o garimpo remetem a algum cliente?', options: ['Sim', 'Não'], section: 'OPEC', required: true },
  { id: 'conferido_lista', question: 'Conferido na Lista de Clientes da Planilha', options: ['Sim', 'Não'], section: 'OPEC', required: true },
  { id: 'lideranca_liberou', question: 'Se tiver relação, a liderança liberou a tratativa?', options: ['Sim', 'Não', 'N/A'], section: 'OPEC' },
  { id: 'concorrente_lista_nao_contato', question: 'Concorrente está na lista de ❌ Concorrentes para não entrar em contato?', options: ['Sim', 'Não'], section: 'OPEC', required: true },
  { id: 'agencias_parceiras', question: 'Concorrente está na lista de Agencias Parceiras?', options: ['Sim', 'Não'], section: 'OPEC', required: true },
  
  // Linguagem
  { id: 'possui_print', question: 'Possui print?', options: ['Sim', 'Não'], section: 'Linguagem', required: true },
  { id: 'idioma', question: 'Idioma', options: ['🇧🇷 Português', '🇺🇸 Inglês', '🇪🇸 Espanhol'], section: 'Linguagem', required: true },
];

export function ChecklistForm() {
  const [formData, setFormData] = useState<FormData>({});
  const [rawData, setRawData] = useState('');
  const [extractedContacts, setExtractedContacts] = useState<{name: string, email: string}[]>([]);
  const [generatedCode, setGeneratedCode] = useState('');
  const [generatedComment, setGeneratedComment] = useState('');
  const [generatedSuggestion, setGeneratedSuggestion] = useState('');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [responsibleName, setResponsibleName] = useState('');
  const fieldRefs = useRef<(HTMLInputElement | null)[]>(new Array(CHECKLIST_QUESTIONS.length).fill(null));

  // Carrega dados salvos
  useEffect(() => {
    const saved = localStorage.getItem('checklist-form-data');
    if (saved) {
      try {
        const parsedData = JSON.parse(saved);
        setFormData(parsedData.formData || {});
        setRawData(parsedData.rawData || '');
        setExtractedContacts(parsedData.extractedContacts || []);
      } catch (e) {
        console.error('Erro ao carregar dados:', e);
      }
    }

    // Carrega configurações para obter nome do responsável
    const savedConfig = localStorage.getItem('checklist-config');
    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig);
        setResponsibleName(config.userSettings?.nome || '');
      } catch (e) {
        console.error('Erro ao carregar configurações:', e);
      }
    }

    // Carrega templates salvos
    const savedTemplates = localStorage.getItem('checklist-templates');
    if (savedTemplates) {
      try {
        setTemplates(JSON.parse(savedTemplates));
      } catch (e) {
        console.error('Erro ao carregar templates:', e);
        // Templates padrão
        setTemplates([
          {
            id: '1',
            name: 'Hotline Aprovado',
            conditions: { fase: 'Hotline', card_aprovado: 'Sim', temos_hotline: 'Sim' },
            code: 'HTSPT1',
            comment: 'Enviar ciclo 1 de hotline'
          }
        ]);
      }
    } else {
      // Templates padrão
      setTemplates([
        {
          id: '1',
          name: 'Hotline Aprovado',
          conditions: { fase: 'Hotline', card_aprovado: 'Sim', temos_hotline: 'Sim' },
          code: 'HTSPT1',
          comment: 'Enviar ciclo 1 de hotline'
        }
      ]);
    }
  }, []);

  // Monitora mudanças nas configurações para atualizar o nome do responsável
  useEffect(() => {
    const handleStorageChange = () => {
      const savedConfig = localStorage.getItem('checklist-config');
      if (savedConfig) {
        try {
          const config = JSON.parse(savedConfig);
          setResponsibleName(config.userSettings?.nome || '');
        } catch (e) {
          console.error('Erro ao carregar configurações:', e);
        }
      }
    };

    // Escuta mudanças no localStorage
    window.addEventListener('storage', handleStorageChange);
    
    // Verifica periodicamente por mudanças (para mudanças na mesma aba)
    const interval = setInterval(handleStorageChange, 1000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  const generateOutputs = useCallback(() => {
    // Verifica se há template que corresponde às condições atuais
    const matchingTemplate = templates.find(template => {
      return Object.entries(template.conditions).every(([key, value]) => {
        return formData[key] === value;
      });
    });

    if (matchingTemplate) {
      setGeneratedCode(matchingTemplate.code);
      setGeneratedSuggestion(matchingTemplate.comment);
    } else {
      // Gera código baseado nas respostas (fallback)
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '_');
      const approvedStatus = formData.card_aprovado === 'Sim' ? 'APR' : 'REJ';
      const code = `CHK_${approvedStatus}_${timestamp}`;
      setGeneratedCode(code);

      // Gera sugestão baseada em template (fallback)
      setGeneratedSuggestion('Nenhum template correspondente encontrado. Configure templates na aba Configuração.');
    }

    // Sempre gera o comentário no formato especificado
    const today = new Date();
    const dateString = today.toLocaleDateString('pt-BR');
    const fase = formData.fase || '[Fase]';
    
    // Monta as respostas do checklist com ** para negrito
    const formatAnswer = (answer: string) => answer ? `**${answer}**` : '**[Não respondido]**';
    
    const responsavel = responsibleName || '[Nome do responsavel]';
    let comment = `${responsavel} | X tentativa ${fase} enviada em ${dateString}\n\n`;
    
    comment += `**Checklist N1:**\n`;
    comment += `Card foi aprovado pelo cliente? ${formatAnswer(formData.card_aprovado)}\n`;
    comment += `É uma nova tentativa? Se sim, tivemos retorno no e-mail? ${formatAnswer(formData.nova_tentativa)}\n`;
    comment += `Existe outro card desse concorrente em fluxo? ${formatAnswer(formData.outro_card)}\n`;
    comment += `Possui etiqueta de Prioridade, Concorrente não quer contato, Tratativa Atendimento ou NE Branddi? ${formatAnswer(formData.possui_etiqueta)}\n`;
    comment += `Se sim, qual? ${formatAnswer(formData.qual_etiqueta)}\n`;
    comment += `Temos hotline? ${formatAnswer(formData.temos_hotline)}\n\n`;
    
    comment += `**Checagens no site de OPEC:**\n`;
    comment += `O site do concorrente ou o garimpo remetem a algum cliente? ${formatAnswer(formData.site_remete_cliente)}\n`;
    comment += `Conferido na Lista de Clientes da Planilha ${formatAnswer(formData.conferido_lista)}\n`;
    comment += `Se tiver relação, a liderança liberou a tratativa? ${formatAnswer(formData.lideranca_liberou)}\n`;
    comment += `Concorrente está na lista de ❌ Concorrentes para não entrar em contato? ${formatAnswer(formData.concorrente_lista_nao_contato)}\n`;
    comment += `Concorrente está na lista de Agencias Parceiras? ${formatAnswer(formData.agencias_parceiras)}\n\n`;
    
    comment += `**Tratativas**\n`;
    
    // Adiciona os contatos extraídos
    if (extractedContacts.length > 0) {
      extractedContacts.forEach(contact => {
        comment += `${contact.name} | | ${contact.email}\n`;
      });
    } else {
      comment += `[Nome do contato] | | [E-mail do contato]\n`;
    }
    
    setGeneratedComment(comment);
  }, [formData, extractedContacts, templates, responsibleName]);

  // Salva dados automaticamente
  useEffect(() => {
    const dataToSave = {
      formData,
      rawData,
      extractedContacts
    };
    localStorage.setItem('checklist-form-data', JSON.stringify(dataToSave));
    
    // Gera código e comentário baseado nas respostas
    generateOutputs();
  }, [formData, extractedContacts, generateOutputs]);

  const extractContactsFromRawData = (data: string) => {
    const contacts: {name: string, email: string}[] = [];
    const lines = data.split('\n').filter(line => line.trim());
    
    for (const line of lines) {
      // Divide a linha em colunas (assumindo separação por tab ou múltiplos espaços)
      const columns = line.split(/\t|\s{2,}/).map(col => col.trim()).filter(col => col);
      
      if (columns.length >= 8) {
        // Coluna 8 (índice 7) indica se deve ignorar
        const shouldIgnore = columns[7]?.toLowerCase() === 'sim';
        
        if (!shouldIgnore) {
          // Coluna 3 (índice 2) = nome, Coluna 4 (índice 3) = email
          const name = columns[2] || '';
          const email = columns[3] || '';
          
          // Verifica se o email é válido
          const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
          if (name && email && emailRegex.test(email)) {
            contacts.push({ name, email });
          }
        }
      } else {
        // Fallback para formato antigo
        const emailMatch = line.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
        if (emailMatch) {
          const email = emailMatch[1];
          let name = line.replace(email, '').trim();
          name = name.replace(/[,;:|<>(){}[\]]/g, '').trim();
          if (!name || name.length < 2) {
            name = email.split('@')[0];
          }
          contacts.push({ name, email });
        }
      }
    }
    
    setExtractedContacts(contacts);
  };

  const handleRawDataChange = (value: string) => {
    setRawData(value);
    if (value.trim()) {
      extractContactsFromRawData(value);
    } else {
      setExtractedContacts([]);
    }
  };

  const handleFieldChange = (fieldId: string, value: string) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
  };

  const getFieldValidation = (question: ChecklistQuestion) => {
    const value = formData[question.id];
    if (!value) {
      if (question.required) {
        return { status: 'error', color: 'border-red-500 bg-red-50' };
      }
      return { status: 'neutral', color: '' };
    }

    // Validações específicas
    if (question.id === 'concorrente_lista_nao_contato' && value === 'Sim') {
      return { status: 'warning', color: 'border-orange-500 bg-orange-50' };
    }
    if (question.id === 'card_aprovado' && value === 'Não') {
      return { status: 'warning', color: 'border-orange-500 bg-orange-50' };
    }
    if (question.id === 'nova_tentativa' && value === 'Sim, sem retorno') {
      return { status: 'warning', color: 'border-orange-500 bg-orange-50' };
    }

    return { status: 'success', color: 'border-green-500 bg-green-50' };
  };

  const handleKeyDown = (e: React.KeyboardEvent, currentIndex: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const nextIndex = currentIndex + 1;
      if (nextIndex < fieldRefs.current.length) {
        fieldRefs.current[nextIndex]?.focus();
      }
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    if (!text || text.trim() === '') {
      toast.error(`${label} está vazio`);
      return;
    }

    // Método 1: Tenta usar a API moderna do clipboard (se disponível e permitida)
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text)
        .then(() => {
          toast.success(`${label} copiado!`);
        })
        .catch(() => {
          // Se falhar, usa o método alternativo
          fallbackCopy(text, label);
        });
    } else {
      // Usa o método alternativo diretamente
      fallbackCopy(text, label);
    }
  };

  const fallbackCopy = (text: string, label: string) => {
    try {
      // Cria um elemento span temporário (mais compatível que textarea)
      const span = document.createElement('span');
      span.textContent = text;
      
      // Estilo para manter o elemento acessível mas invisível
      span.style.position = 'absolute';
      span.style.left = '-9999px';
      span.style.top = '-9999px';
      span.style.fontSize = '12px';
      span.style.border = '0';
      span.style.padding = '0';
      span.style.margin = '0';
      span.style.outline = '0';
      span.style.boxShadow = 'none';
      span.style.background = 'transparent';
      span.style.whiteSpace = 'pre';
      
      // Adiciona ao DOM
      document.body.appendChild(span);
      
      // Cria uma seleção
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(span);
      selection?.removeAllRanges();
      selection?.addRange(range);
      
      // Tenta copiar
      let successful = false;
      try {
        successful = document.execCommand('copy');
      } catch (err) {
        successful = false;
      }
      
      // Limpa a seleção e remove o elemento
      selection?.removeAllRanges();
      document.body.removeChild(span);
      
      if (successful) {
        toast.success(`${label} copiado!`);
      } else {
        // Último recurso: mostrar em um prompt/alert
        showTextForManualCopy(text, label);
      }
    } catch (err) {
      console.error('Erro no fallback de cópia:', err);
      showTextForManualCopy(text, label);
    }
  };

  const showTextForManualCopy = (text: string, label: string) => {
    // Cria uma modal/dialog temporária para mostrar o texto
    const modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.zIndex = '9999';
    
    const content = document.createElement('div');
    content.style.backgroundColor = 'white';
    content.style.padding = '20px';
    content.style.borderRadius = '8px';
    content.style.maxWidth = '90%';
    content.style.maxHeight = '80%';
    content.style.overflow = 'auto';
    content.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
    
    const title = document.createElement('h3');
    title.textContent = `Copie o ${label.toLowerCase()} manualmente:`;
    title.style.marginTop = '0';
    title.style.marginBottom = '10px';
    
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.width = '100%';
    textArea.style.height = '200px';
    textArea.style.border = '1px solid #ccc';
    textArea.style.borderRadius = '4px';
    textArea.style.padding = '8px';
    textArea.style.fontFamily = 'monospace';
    textArea.style.fontSize = '12px';
    textArea.readOnly = true;
    
    const button = document.createElement('button');
    button.textContent = 'Fechar';
    button.style.marginTop = '10px';
    button.style.padding = '8px 16px';
    button.style.backgroundColor = '#007bff';
    button.style.color = 'white';
    button.style.border = 'none';
    button.style.borderRadius = '4px';
    button.style.cursor = 'pointer';
    
    content.appendChild(title);
    content.appendChild(textArea);
    content.appendChild(button);
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    // Seleciona o texto automaticamente
    textArea.select();
    textArea.setSelectionRange(0, textArea.value.length);
    
    // Remove a modal ao clicar no botão ou fora dela
    const closeModal = () => {
      document.body.removeChild(modal);
    };
    
    button.onclick = closeModal;
    modal.onclick = (e) => {
      if (e.target === modal) closeModal();
    };
    
    // Remove a modal após 30 segundos automaticamente
    setTimeout(closeModal, 30000);
    
    toast.info(`${label} exibido para cópia manual`);
  };

  const clearAll = () => {
    setFormData({});
    setRawData('');
    setExtractedContacts([]);
    setGeneratedCode('');
    setGeneratedComment('');
    setGeneratedSuggestion('');
    localStorage.removeItem('checklist-form-data');
    toast.success('Todos os dados foram limpos');
  };

  const renderValidationIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-orange-600" />;
      default:
        return null;
    }
  };

  const completedFields = CHECKLIST_QUESTIONS.filter(q => formData[q.id]).length;
  const totalFields = CHECKLIST_QUESTIONS.length;
  const progressPercentage = (completedFields / totalFields) * 100;

  const renderSelectField = (question: ChecklistQuestion, index: number, actualIndex: number) => {
    const validation = getFieldValidation(question);
    
    return (
      <div key={question.id} className="space-y-2">
        <Label className="text-sm flex items-center gap-2">
          {question.question}
          {question.required && <span className="text-red-500">*</span>}
          {renderValidationIcon(validation.status)}
        </Label>
        <EditableSelect
          ref={(el) => (fieldRefs.current[actualIndex] = el)}
          value={formData[question.id] || ''}
          options={question.options}
          onChange={(value) => handleFieldChange(question.id, value)}
          onKeyDown={(e) => handleKeyDown(e, actualIndex)}
          placeholder="Digite ou selecione uma opção"
          className={validation.color}
        />
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header com progresso */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>Checklist de Verificação</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {completedFields}/{totalFields}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {Math.round(progressPercentage)}%
              </span>
            </div>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </CardHeader>
      </Card>

      {/* Formulário principal */}
      <Card>
        <CardContent className="space-y-6 pt-6">
          {/* Fase */}
          <div className="space-y-4">
            <h3 className="font-medium text-lg border-b pb-2">Fase</h3>
            {CHECKLIST_QUESTIONS.filter(q => q.section === 'Fase').map((question, index) => 
              renderSelectField(question, index, index)
            )}
          </div>

          {/* Checklist N1 */}
          <div className="space-y-4">
            <h3 className="font-medium text-lg border-b pb-2">Checklist N1</h3>
            {CHECKLIST_QUESTIONS.filter(q => q.section === 'N1').map((question, index) => {
              const actualIndex = CHECKLIST_QUESTIONS.filter(q => q.section === 'Fase').length + index;
              return renderSelectField(question, index, actualIndex);
            })}
          </div>

          {/* Checagens OPEC */}
          <div className="space-y-4">
            <h3 className="font-medium text-lg border-b pb-2">Checagens no site de OPEC</h3>
            {CHECKLIST_QUESTIONS.filter(q => q.section === 'OPEC').map((question, index) => {
              const actualIndex = CHECKLIST_QUESTIONS.filter(q => q.section === 'Fase' || q.section === 'N1').length + index;
              return renderSelectField(question, index, actualIndex);
            })}
          </div>

          {/* Linguagem */}
          <div className="space-y-4">
            <h3 className="font-medium text-lg border-b pb-2">Linguagem</h3>
            {CHECKLIST_QUESTIONS.filter(q => q.section === 'Linguagem').map((question, index) => {
              const actualIndex = CHECKLIST_QUESTIONS.filter(q => q.section === 'Fase' || q.section === 'N1' || q.section === 'OPEC').length + index;
              return renderSelectField(question, index, actualIndex);
            })}
          </div>
        </CardContent>
      </Card>

      {/* Extração de contatos */}
      <ContactTable
        rawData={rawData}
        onDataChange={setRawData}
        onContactsExtracted={setExtractedContacts}
      />

      {/* Resultados */}
      <Card>
        <CardHeader>
          <CardTitle>Resultados Gerados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Código gerado</Label>
              <div className="flex gap-2">
                <div className="flex-1 p-2 bg-muted rounded text-sm font-mono">
                  {generatedCode || 'Aguardando respostas...'}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(generatedCode, 'Código')}
                  disabled={!generatedCode}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Email dos contatos</Label>
              <div className="flex gap-2">
                <div className="flex-1 p-2 bg-muted rounded text-sm">
                  {extractedContacts.map(c => c.email).join('; ') || 'Nenhum contato extraído'}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(extractedContacts.map(c => c.email).join('; '), 'Emails')}
                  disabled={extractedContacts.length === 0}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Comentário Gerado</Label>
              <div className="flex gap-2">
                <div className="flex-1 p-2 bg-muted rounded text-sm whitespace-pre-wrap">
                  {generatedComment || 'Aguardando respostas...'}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(generatedComment, 'Comentário Gerado')}
                  disabled={!generatedComment}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Sugestão</Label>
              <div className="flex gap-2">
                <div className="flex-1 p-2 bg-muted rounded text-sm">
                  {generatedSuggestion || 'Aguardando template correspondente...'}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(generatedSuggestion, 'Sugestão')}
                  disabled={!generatedSuggestion}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ações */}
      <div className="flex justify-center">
        <Button
          variant="destructive"
          onClick={clearAll}
          className="gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          Apagar Tudo
        </Button>
      </div>
    </div>
  );
}